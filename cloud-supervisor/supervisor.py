#!/usr/bin/env python3
"""
Comfy Portal cloud supervisor.

Runs as the container's entrypoint on a rented GPU. It brings the instance from
"the container just started" to "ComfyUI is serving", and — this is the point —
says out loud what it is doing the whole time.

The app has no backend: it talks to vast's API and then straight to this
process. Before it existed the only progress signal was vast's `status_msg`,
which is vast tailing the container log, so a user watching 47 GiB of models
download saw one unchanging line for half an hour.

Stdlib only, and baked into the image rather than downloaded, so it answers
within a second of the container starting instead of after apt.
"""

import base64
import json
import os
import shutil
import signal
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SUPERVISOR_VERSION = 1

WORKSPACE = os.environ.get("CP_WORKSPACE", "/workspace")
COMFY_DIR = os.environ.get("COMFY_DIR", "/opt/comfyui")
COMFY_PORT = int(os.environ.get("COMFY_PORT", "8188"))
SUPERVISOR_PORT = int(os.environ.get("CP_PORT", "8189"))
TOKEN = os.environ.get("CP_TOKEN", "")

HF_TOKEN = os.environ.get("HF_TOKEN", "")
CIVITAI_API_KEY = os.environ.get("CIVITAI_API_KEY", "")

STATE_PATH = os.path.join(WORKSPACE, "supervisor-state.json")
LOG_PATH = os.path.join(WORKSPACE, "supervisor.log")
COMFY_LOG = os.path.join(WORKSPACE, "comfyui.log")
OLLAMA_LOG = os.path.join(WORKSPACE, "ollama.log")

ARIA2_PORT = 6800
ARIA2_SECRET = base64.urlsafe_b64encode(os.urandom(18)).decode().rstrip("=")

# Downloading one file from one host tops out well below the box's uplink, so
# several run at once — but not all of them, or they just compete for it.
MAX_CONCURRENT_DOWNLOADS = int(os.environ.get("CP_MAX_DOWNLOADS", "4"))

# No byte movement for this long means something is wedged. Saying so beats
# letting the user watch a still progress bar until the app's timeout fires.
STALL_SECONDS = int(os.environ.get("CP_STALL_SECONDS", "300"))

# Anything matching these never reaches a log file or an HTTP response. The
# agent's own port is public, and aria2 echoes request headers on failure.
SECRETS = [s for s in (TOKEN, HF_TOKEN, CIVITAI_API_KEY, ARIA2_SECRET) if len(s) >= 8]


def redact(text):
    for secret in SECRETS:
        text = text.replace(secret, "***")
    return text


_log_lock = threading.Lock()


def log(message):
    line = "[%s] %s" % (time.strftime("%H:%M:%S"), redact(str(message)))
    with _log_lock:
        print(line, flush=True)
        try:
            with open(LOG_PATH, "a") as handle:
                handle.write(line + "\n")
        except OSError:
            pass


# --------------------------------------------------------------------- state --


class State:
    """
    The single source of truth behind /v1/status.

    Persisted after every transition so the supervisor can be restarted — by a crash,
    or by vast stopping and starting the instance — and pick up where it left
    off instead of re-downloading tens of gigabytes that are already on disk.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.phase = "preparing"
        self.started_at = int(time.time())
        self.steps = []
        self.models = {}
        self.services = {}
        self.error = None
        self.last_progress_at = int(time.time())
        self.stalled = False

    def step(self, step_id, state, detail=""):
        with self.lock:
            for existing in self.steps:
                if existing["id"] == step_id:
                    existing["state"] = state
                    existing["detail"] = detail
                    if state in ("done", "failed"):
                        existing["ms"] = int((time.time() - existing["_start"]) * 1000)
                    break
            else:
                self.steps.append(
                    {
                        "id": step_id,
                        "state": state,
                        "detail": detail,
                        "ms": None,
                        "_start": time.time(),
                    }
                )
        log("step %s -> %s %s" % (step_id, state, detail))
        self.persist()

    def set_phase(self, phase):
        with self.lock:
            self.phase = phase
        log("phase -> %s" % phase)
        self.persist()

    def fail(self, code, message, hint=""):
        with self.lock:
            self.phase = "failed"
            self.error = {"code": code, "message": redact(message), "hint": hint}
        log("FAILED %s: %s" % (code, message))
        self.persist()

    def snapshot(self):
        with self.lock:
            models = list(self.models.values())
            completed = sum(m.get("completed") or 0 for m in models)
            total = sum(m.get("total") or 0 for m in models)
            speed = sum(m.get("speed") or 0 for m in models if m.get("state") == "active")
            eta = int((total - completed) / speed) if speed > 0 and total > completed else None
            return {
                "supervisorVersion": SUPERVISOR_VERSION,
                "phase": self.phase,
                "startedAt": self.started_at,
                "elapsed": int(time.time()) - self.started_at,
                "stalled": self.stalled,
                "lastProgressAt": self.last_progress_at,
                "steps": [
                    {k: v for k, v in step.items() if not k.startswith("_")}
                    for step in self.steps
                ],
                "models": models,
                "totals": {
                    "bytes": total,
                    "completed": completed,
                    "speed": speed,
                    "etaSeconds": eta,
                },
                "services": dict(self.services),
                "error": self.error,
            }

    def persist(self):
        try:
            payload = self.snapshot()
            tmp = STATE_PATH + ".tmp"
            with open(tmp, "w") as handle:
                json.dump(payload, handle)
            # Atomic: a half-written state file read after a crash would be
            # worse than no state file at all.
            os.replace(tmp, STATE_PATH)
        except OSError as exc:
            log("could not persist state: %s" % exc)


STATE = State()


# ---------------------------------------------------------------- aria2 rpc --


class Aria2Error(Exception):
    pass


def aria2_call(method, params=None):
    payload = {
        "jsonrpc": "2.0",
        "id": "cpa",
        "method": method,
        "params": ["token:" + ARIA2_SECRET] + list(params or []),
    }
    request = urllib.request.Request(
        "http://127.0.0.1:%d/jsonrpc" % ARIA2_PORT,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.loads(response.read().decode())
    if "error" in body:
        raise Aria2Error(body["error"].get("message", "aria2 error"))
    return body.get("result")


def start_aria2():
    """
    One long-lived aria2 with its RPC open, rather than a process per file.

    The RPC is what makes real progress possible: tellStatus reports exact
    completedLength, totalLength and downloadSpeed per file, which is the data
    behind every progress bar the app draws. It also owns retries and the
    concurrency limit, replacing a hand-rolled loop that could not report
    anything while it ran.
    """
    subprocess.Popen(
        [
            "aria2c",
            "--enable-rpc",
            "--rpc-listen-port=%d" % ARIA2_PORT,
            "--rpc-secret=%s" % ARIA2_SECRET,
            # Loopback only. This is an internal control channel and the box has
            # a public IP.
            "--rpc-listen-all=false",
            "--max-concurrent-downloads=%d" % MAX_CONCURRENT_DOWNLOADS,
            "--continue=true",
            "--file-allocation=none",
            "--max-tries=0",
            "--retry-wait=5",
            "--split=16",
            "--max-connection-per-server=16",
            "--min-split-size=1M",
            "--summary-interval=0",
            "--console-log-level=warn",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(50):
        try:
            aria2_call("aria2.getVersion")
            return
        except Exception:
            time.sleep(0.2)
    raise Aria2Error("aria2 RPC did not come up")


# ------------------------------------------------------------------ manifest --


def load_manifest():
    """
    The launch's models, extensions and Ollama models.

    Delivered base64-encoded in a single variable because vast takes container
    env as one docker-flag string split on whitespace — a multi-line value
    silently loses everything after its first line, and the same value has to
    survive being appended to /etc/environment, which is line-oriented too.
    """
    raw = os.environ.get("CP_MANIFEST", "")
    if not raw:
        return {"models": [], "extensions": [], "ollamaModels": []}
    try:
        decoded = base64.b64decode(raw).decode("utf-8")
        manifest = json.loads(decoded)
    except Exception as exc:
        raise ValueError("CP_MANIFEST is not valid base64 JSON: %s" % exc)
    manifest.setdefault("models", [])
    manifest.setdefault("extensions", [])
    manifest.setdefault("ollamaModels", [])
    return manifest


# ----------------------------------------------------------------- downloads --


def head_size(url):
    """Content length without fetching the body, for the disk pre-check."""
    headers = {"User-Agent": "Mozilla/5.0"}
    if "civitai.com" in url and CIVITAI_API_KEY:
        headers["Authorization"] = "Bearer " + CIVITAI_API_KEY
    elif HF_TOKEN:
        headers["Authorization"] = "Bearer " + HF_TOKEN
    request = urllib.request.Request(url, method="HEAD", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            # HuggingFace reports the real size of an LFS object here;
            # content-length would be the pointer file's.
            linked = response.headers.get("x-linked-size")
            return int(linked or response.headers.get("content-length") or 0)
    except Exception:
        return 0


def resolve_civitai(url):
    """
    Turn a Civitai download URL into the signed URL it redirects to.

    Resolving here rather than letting aria2 follow the redirect is deliberate:
    aria2 applies --header across redirects unconditionally, and Civitai lands
    on either a B2- or an R2-backed signed URL depending on the asset. B2
    tolerates the stray Authorization; R2 rejects it with a flat 400, because
    its signature covers only `host`. Handing aria2 the bare signed URL sidesteps
    both and keeps all 16 connections instead of dropping to one.
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    if CIVITAI_API_KEY:
        headers["Authorization"] = "Bearer " + CIVITAI_API_KEY

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, hdrs, newurl):
            raise urllib.error.HTTPError(newurl, code, msg, hdrs, fp)

    opener = urllib.request.build_opener(NoRedirect)
    try:
        opener.open(urllib.request.Request(url, headers=headers), timeout=30)
    except urllib.error.HTTPError as exc:
        if exc.code in (301, 302, 303, 307, 308):
            return exc.headers.get("Location") or url
        raise
    return url


# Original spec per model key, so a failed download can be retried later
# without the app having to re-send the manifest.
MODEL_SPECS = {}
PENDING = {}
_dl_lock = threading.Lock()


def model_key(model):
    url = model["url"]
    folder = model.get("folder") or model.get("type") or "checkpoints"
    filename = model.get("filename") or os.path.basename(urllib.parse.urlparse(url).path)
    return "%s/%s" % (folder, filename), folder, filename


def add_download(model):
    """
    Hand one model to aria2 and record its gid.

    Returns None when the file is already on disk, which is the normal case
    after a restart: /workspace survives, so a launch interrupted at 40 of 47
    GiB resumes rather than starting over.
    """
    key, folder, filename = model_key(model)
    url = model["url"]
    destination = os.path.join(WORKSPACE, "models", folder)
    os.makedirs(destination, exist_ok=True)
    MODEL_SPECS[key] = model

    existing = os.path.join(destination, filename)
    if os.path.exists(existing) and os.path.getsize(existing) > 0:
        size = os.path.getsize(existing)
        with STATE.lock:
            STATE.models[key] = {
                "name": filename, "folder": folder, "total": size,
                "completed": size, "speed": 0, "state": "done", "error": None,
            }
        log("skip %s (already on disk)" % filename)
        return None

    options = {"dir": destination, "out": filename}
    if "civitai.com" in url:
        try:
            url = resolve_civitai(url)
        except Exception as exc:
            log("civitai resolve failed for %s: %s" % (filename, exc))
        # No header at all on the signed URL — see resolve_civitai.
    elif HF_TOKEN:
        options["header"] = ["Authorization: Bearer " + HF_TOKEN]

    gid = aria2_call("aria2.addUri", [[url], options])
    with _dl_lock:
        PENDING[gid] = key
    with STATE.lock:
        STATE.models[key] = {
            "name": filename, "folder": folder,
            "total": model.get("sizeBytes") or 0,
            "completed": 0, "speed": 0, "state": "waiting", "error": None,
        }
    return gid


def queue_downloads(models):
    for model in models:
        try:
            add_download(model)
        except Exception as exc:
            key = model_key(model)[0]
            with STATE.lock:
                STATE.models[key] = {
                    "name": key.split("/")[-1], "folder": key.split("/")[0],
                    "total": 0, "completed": 0, "speed": 0,
                    "state": "error", "error": redact(str(exc)),
                }
            log("queue failed %s: %s" % (key, exc))


def retry_models(keys=None):
    """
    Re-queue failed downloads.

    A single bad LoRA should never cost someone the whole instance, so a failure
    marks that one model and the rest carry on. This is how the app turns that
    into a retry button rather than a relaunch.
    """
    with STATE.lock:
        targets = [
            key for key, entry in STATE.models.items()
            if entry.get("state") == "error" and (keys is None or key in keys)
        ]
    for key in targets:
        spec = MODEL_SPECS.get(key)
        if not spec:
            continue
        log("retrying %s" % key)
        try:
            add_download(spec)
        except Exception as exc:
            log("retry failed to queue %s: %s" % (key, exc))
    return targets


def classify_download_error(message):
    if "401" in message or "403" in message or "authorization" in message.lower():
        return "model_auth_failed", "Check the API key for that host."
    if "404" in message or "not found" in message.lower():
        return "model_not_found", "The URL no longer resolves to a file."
    if "no space" in message.lower():
        return "disk_full", "Relaunch with a larger disk."
    return "model_failed", "Retry, or check the URL."


def download_poller():
    """
    Mirror aria2's view into the snapshot, for the life of the process.

    Runs continuously rather than until the queue empties, so a retry issued
    long after the initial pass is tracked exactly like the first attempt.
    """
    while True:
        moved = False
        with _dl_lock:
            current = dict(PENDING)

        for gid, key in current.items():
            try:
                status = aria2_call("aria2.tellStatus", [gid])
            except Aria2Error as exc:
                log("tellStatus %s: %s" % (key, exc))
                continue

            completed = int(status.get("completedLength") or 0)
            total = int(status.get("totalLength") or 0)
            state = status.get("status", "active")

            with STATE.lock:
                entry = STATE.models.get(key, {})
                if completed > (entry.get("completed") or 0):
                    moved = True
                entry.update({
                    "completed": completed,
                    "total": total or entry.get("total") or 0,
                    "speed": int(status.get("downloadSpeed") or 0),
                    "state": "done" if state == "complete" else state,
                })
                if state == "error":
                    message = status.get("errorMessage", "download failed")
                    code, hint = classify_download_error(message)
                    entry["state"] = "error"
                    entry["error"] = redact(message)
                    entry["errorCode"] = code
                    entry["hint"] = hint
                STATE.models[key] = entry

            if state in ("complete", "error"):
                with _dl_lock:
                    PENDING.pop(gid, None)
                log("%s %s" % ("downloaded" if state == "complete" else "FAILED", key))

        now = int(time.time())
        with STATE.lock:
            downloading = bool(current)
            if moved:
                STATE.last_progress_at = now
                STATE.stalled = False
            elif downloading and now - STATE.last_progress_at > STALL_SECONDS:
                STATE.stalled = True
        if current:
            STATE.persist()
        time.sleep(2)


def wait_for_downloads():
    """Block until nothing is in flight. Failures don't block — they're reported."""
    while True:
        with _dl_lock:
            if not PENDING:
                break
        time.sleep(2)
    with STATE.lock:
        return [k for k, v in STATE.models.items() if v.get("state") == "error"]


# ---------------------------------------------------------------- processes --


def spawn(name, argv, log_path, cwd=None, env=None):
    handle = open(log_path, "a")
    process = subprocess.Popen(argv, cwd=cwd, stdout=handle, stderr=handle, env=env)
    with STATE.lock:
        service = STATE.services.get(name, {"restarts": 0})
        service.update({"state": "running", "pid": process.pid})
        STATE.services[name] = service
    return process


def supervise(processes):
    """
    Keep ComfyUI (and Ollama, when present) alive for the life of the instance.

    Staying resident past "ready" is the whole reason a server can go offline
    and the user can still find out why: before this, a crashed ComfyUI looked
    identical to a network problem from the app's side.
    """
    while True:
        for name, spec in processes.items():
            process = spec["process"]
            if process.poll() is None:
                continue
            with STATE.lock:
                service = STATE.services.setdefault(name, {"restarts": 0})
                service["restarts"] = service.get("restarts", 0) + 1
                service["state"] = "restarting"
                service["lastExit"] = process.returncode
            log("%s exited with %s — restarting" % (name, process.returncode))
            spec["process"] = spawn(name, spec["argv"], spec["log"], cwd=spec.get("cwd"), env=spec.get("env"))
            STATE.persist()
        time.sleep(5)


# --------------------------------------------------------------- http server --


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass  # The default handler writes to stderr on every poll.

    def _authorised(self):
        if not TOKEN:
            return True
        header = self.headers.get("Authorization", "")
        return header == "Bearer " + TOKEN

    def _send(self, code, body, content_type="application/json"):
        encoded = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        # /health is deliberately unauthenticated: it proves the port is
        # published and the supervisor is up, and reveals nothing.
        if parsed.path == "/v1/health":
            return self._send(200, json.dumps({"ok": True, "supervisorVersion": SUPERVISOR_VERSION}))

        if not self._authorised():
            return self._send(401, json.dumps({"error": "unauthorised"}))

        if parsed.path == "/v1/status":
            return self._send(200, json.dumps(STATE.snapshot()))

        if parsed.path == "/v1/log":
            query = urllib.parse.parse_qs(parsed.query)
            stream = (query.get("stream") or ["supervisor"])[0]
            tail = int((query.get("tail") or ["200"])[0])
            path = {"supervisor": LOG_PATH, "comfyui": COMFY_LOG, "ollama": OLLAMA_LOG}.get(stream, LOG_PATH)
            try:
                with open(path) as handle:
                    lines = handle.readlines()[-tail:]
            except OSError:
                lines = []
            return self._send(200, redact("".join(lines)), "text/plain; charset=utf-8")

        if parsed.path == "/v1/events":
            return self._events()

        return self._send(404, json.dumps({"error": "not found"}))

    def _events(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            while True:
                payload = json.dumps(STATE.snapshot())
                self.wfile.write(("data: %s\n\n" % payload).encode())
                self.wfile.flush()
                time.sleep(2)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        if not self._authorised():
            return self._send(401, json.dumps({"error": "unauthorised"}))
        if self.path == "/v1/models/retry":
            length = int(self.headers.get("Content-Length") or 0)
            keys = None
            if length:
                try:
                    keys = json.loads(self.rfile.read(length)).get("keys")
                except Exception:
                    keys = None
            retried = retry_models(keys)
            return self._send(200, json.dumps({"retried": retried}))

        if self.path == "/v1/comfyui/restart":
            service = PROCESSES.get("comfyui")
            if service and service["process"].poll() is None:
                service["process"].terminate()
            return self._send(200, json.dumps({"ok": True}))
        return self._send(404, json.dumps({"error": "not found"}))


PROCESSES = {}


def serve_http():
    server = ThreadingHTTPServer(("0.0.0.0", SUPERVISOR_PORT), Handler)
    server.daemon_threads = True
    log("supervisor listening on :%d" % SUPERVISOR_PORT)
    server.serve_forever()


# ------------------------------------------------------------------ pipeline --


def link_into_comfy():
    """
    Point ComfyUI's mutable directories at /workspace.

    The image ships the code and the venv; /workspace is the only disk vast
    actually mounts, and the only one sized for models.
    """
    for name in ("models", "input", "output", "custom_nodes"):
        target = os.path.join(WORKSPACE, name)
        os.makedirs(target, exist_ok=True)
        link = os.path.join(COMFY_DIR, name)
        if os.path.islink(link):
            continue
        if os.path.isdir(link):
            # The image's own custom_nodes (Manager, the endpoint) have to come
            # along, or the app loses /cpe/* the moment this runs.
            for entry in os.listdir(link):
                source = os.path.join(link, entry)
                destination = os.path.join(target, entry)
                if not os.path.exists(destination):
                    shutil.move(source, destination)
            shutil.rmtree(link)
        os.symlink(target, link)


def check_disk(models):
    total = 0
    for model in models:
        size = model.get("sizeBytes") or head_size(model["url"])
        model["sizeBytes"] = size
        total += size
    usage = shutil.disk_usage(WORKSPACE)
    log("models ~%.1f GiB, free %.1f GiB" % (total / 1024**3, usage.free / 1024**3))
    if total and total > usage.free:
        STATE.fail(
            "disk_full",
            "Models need %.0f GiB but only %.0f GiB is free." % (total / 1024**3, usage.free / 1024**3),
            hint="Relaunch with a larger disk in the template.",
        )
        return False
    return True


def install_extensions(extensions):
    root = os.path.join(WORKSPACE, "custom_nodes")
    os.makedirs(root, exist_ok=True)
    pip = os.path.join(COMFY_DIR, "venv", "bin", "pip")
    for url in extensions:
        name = os.path.basename(url.rstrip("/")).replace(".git", "")
        path = os.path.join(root, name)
        if os.path.isdir(path):
            log("skip %s (present)" % name)
            continue
        result = subprocess.run(
            ["git", "clone", "--depth", "1", url, path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            # One bad node shouldn't cost the user the whole instance.
            log("WARN clone failed %s: %s" % (url, result.stderr.strip()[:200]))
            continue
        requirements = os.path.join(path, "requirements.txt")
        if os.path.isfile(requirements) and os.path.isfile(pip):
            subprocess.run([pip, "install", "-q", "-r", requirements], capture_output=True)
        log("installed %s" % name)


def pull_ollama(models):
    if not models or not shutil.which("ollama"):
        return
    PROCESSES["ollama"] = {
        "process": spawn("ollama", ["ollama", "serve"], OLLAMA_LOG),
        "argv": ["ollama", "serve"],
        "log": OLLAMA_LOG,
    }
    time.sleep(3)
    for model in models:
        STATE.step("ollama:" + model, "running")
        result = subprocess.run(["ollama", "pull", model], capture_output=True, text=True)
        STATE.step("ollama:" + model, "done" if result.returncode == 0 else "failed")
    with STATE.lock:
        STATE.services.setdefault("ollama", {})["models"] = list(models)


def run():
    os.makedirs(WORKSPACE, exist_ok=True)
    log("supervisor v%d starting" % SUPERVISOR_VERSION)

    try:
        manifest = load_manifest()
    except ValueError as exc:
        STATE.fail("bad_manifest", str(exc))
        return

    STATE.set_phase("preparing")
    STATE.step("link-directories", "running")
    link_into_comfy()
    STATE.step("link-directories", "done")

    models = manifest["models"]
    if models:
        STATE.step("disk-check", "running")
        if not check_disk(models):
            STATE.step("disk-check", "failed")
            return
        STATE.step("disk-check", "done")

    STATE.step("aria2", "running")
    try:
        start_aria2()
    except Aria2Error as exc:
        STATE.fail("aria2_failed", str(exc))
        STATE.step("aria2", "failed")
        return
    STATE.step("aria2", "done")

    # Extensions and Ollama proceed while models download: on a fresh instance
    # the models are the clock, and everything else is free if it overlaps.
    STATE.set_phase("downloading")
    threading.Thread(target=download_poller, daemon=True).start()
    queue_downloads(models)

    def side_work():
        STATE.step("extensions", "running")
        install_extensions(manifest["extensions"])
        STATE.step("extensions", "done")
        STATE.step("ollama", "running")
        pull_ollama(manifest["ollamaModels"])
        STATE.step("ollama", "done")

    side = threading.Thread(target=side_work, daemon=True)
    side.start()

    failed = wait_for_downloads()
    if failed:
        # Not fatal on purpose: a server with 19 of 20 models is worth far more
        # than no server, and the app offers a retry per model.
        log("%d model(s) failed: %s" % (len(failed), ", ".join(failed)))
    side.join(timeout=1800)

    STATE.set_phase("starting")
    argv = [
        os.path.join(COMFY_DIR, "venv", "bin", "python"),
        "main.py",
        "--listen",
        "0.0.0.0",
        "--port",
        str(COMFY_PORT),
    ]
    PROCESSES["comfyui"] = {
        "process": spawn("comfyui", argv, COMFY_LOG, cwd=COMFY_DIR),
        "argv": argv,
        "log": COMFY_LOG,
        "cwd": COMFY_DIR,
    }

    STATE.step("comfyui-start", "running", "waiting for /system_stats")
    for attempt in range(300):
        try:
            with urllib.request.urlopen(
                "http://127.0.0.1:%d/system_stats" % COMFY_PORT, timeout=5
            ) as response:
                if response.status == 200:
                    STATE.step("comfyui-start", "done")
                    with STATE.lock:
                        STATE.services["comfyui"]["state"] = "running"
                        STATE.services["comfyui"]["answeredAt"] = int(time.time())
                    break
        except Exception:
            if attempt % 15 == 0:
                # Custom nodes import at startup and some are slow; saying so
                # beats a silent ten-minute wait.
                with STATE.lock:
                    STATE.services["comfyui"]["state"] = "starting"
                STATE.persist()
            time.sleep(2)
    else:
        STATE.step("comfyui-start", "failed")
        STATE.fail("comfy_start_timeout", "ComfyUI did not answer after 10 minutes.",
                   hint="Check the comfyui log stream.")
        return

    STATE.set_phase("ready")
    log("ready")
    supervise(PROCESSES)


def main():
    signal.signal(signal.SIGTERM, lambda *_: os._exit(0))
    threading.Thread(target=serve_http, daemon=True).start()
    try:
        run()
    except Exception as exc:  # noqa: BLE001 - last resort, must reach /v1/status
        STATE.fail("supervisor_crashed", "%s: %s" % (type(exc).__name__, exc))
        log("unhandled: %r" % exc)
    # Even after a failure the HTTP server has to stay up — a dead supervisor with a
    # reason is far more useful than an unreachable port.
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    main()
