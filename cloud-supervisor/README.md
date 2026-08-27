# Cloud supervisor

The Docker image a rented GPU boots into, and the program that runs inside it.

**This directory shares no code with the app.** It is Python and Dockerfiles;
nothing here is bundled into the React Native build, and nothing here imports
from the app. The only contract between the two is the HTTP API below, which
`services/cloud-supervisor.ts` consumes.

## Why an image rather than a script

Everything that used to be installed at boot — apt, `git clone`, pip, torch — is
baked in here. vast has no persistent volume, so the previous approach repeated
all of it on every launch, on an arbitrary host, with the GPU billing
throughout. It was the largest source of both failures and cost, and none of it
could be reproduced locally.

What stays at runtime is only what varies per launch: the template's models, its
extensions, and its Ollama models.

## Why a supervisor rather than a shell script

A shell script can install, but it cannot be asked anything. While it ran, the
app's only signal was vast tailing the container log — which is why someone
watching 47 GiB of models download saw a single unchanging line for half an
hour.

`supervisor.py` installs *and* serves a status port, so the app can show which
model is downloading, how many bytes in, what failed and why. It stays resident
after ComfyUI starts, so a crash is something the app can see rather than infer
from a dead socket.

There is no AI in it. It is a state machine, an aria2 JSON-RPC client and an
HTTP handler, using nothing outside the Python standard library.

## API

Served on `:8189`. Every route except `/v1/health` requires
`Authorization: Bearer $CP_TOKEN`; the port is published on a public IP.

| Route | |
|---|---|
| `GET /v1/health` | Unauthenticated liveness — answers the moment the port is published |
| `GET /v1/status` | Full snapshot: phase, steps, per-model bytes and speed, services, error |
| `GET /v1/log?stream=supervisor\|comfyui\|ollama&tail=N` | Redacted log tail |
| `GET /v1/events` | SSE of the same snapshots |
| `POST /v1/models/retry` | Re-queue failed downloads; body `{"keys": [...]}` or empty for all |
| `POST /v1/comfyui/restart` | |

Secrets are stripped from every response. aria2 echoes request headers on
failure, so this is not optional.

## Environment

| | |
|---|---|
| `CP_TOKEN` | Required. Random per launch. |
| `CP_MANIFEST` | base64 of `{models, extensions, ollamaModels}` — see below |
| `HF_TOKEN`, `CIVITAI_API_KEY` | Optional, for gated downloads |
| `COMFY_PORT`, `CP_PORT` | Default 8188 / 8189 |

The manifest is base64 because vast takes container env as one docker-flag
string split on whitespace: a multi-line value silently loses everything after
its first line, and the same value then has to survive `/etc/environment`, which
is line-oriented too.

```json
{
  "version": 1,
  "models": [{"url": "...", "folder": "loras", "filename": "x.safetensors", "sizeBytes": 0}],
  "extensions": ["https://github.com/user/ComfyUI-Something"],
  "ollamaModels": ["llama3.1:8b"]
}
```

## Developing

The real image needs an amd64 host and roughly 20 GB, so CI builds it. The
supervisor's own logic does not — `test/` runs it against a stub ComfyUI with
fixtures served over loopback, so the whole flow is exercised in seconds with no
network and no GPU:

```sh
docker build -f test/Dockerfile -t cp-supervisor-test .
docker run -d --name cp-test -p 18189:8189 \
  -e CP_TOKEN=dev-token-abcdefgh \
  -e CP_MANIFEST="$(python3 -c "import base64,json;print(base64.b64encode(json.dumps({
    'version':1,
    'models':[{'url':'http://127.0.0.1:8000/tiny-model.safetensors','folder':'checkpoints','filename':'t.safetensors'}],
    'extensions':[],'ollamaModels':[]}).encode()).decode())")" \
  cp-supervisor-test

curl -H 'Authorization: Bearer dev-token-abcdefgh' localhost:18189/v1/status
```

Worth exercising when changing it, because each one is a failure that has
already happened: a model 404 must not stop the other models or prevent ComfyUI
starting; a restart must skip files already on disk rather than re-downloading
tens of gigabytes; killing ComfyUI must bring it back with `restarts`
incremented; and the token must never appear in `/v1/log`.

## Ollama

`Dockerfile.ollama` adds Ollama for workflows whose custom nodes call a local
LLM. Those nodes reach it on `127.0.0.1:11434` **inside** the container, so the
port is deliberately not published — an open Ollama endpoint on a public IP is
free compute for whoever finds it.
