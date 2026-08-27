#!/usr/bin/env bash
# Comfy Portal cloud bootstrap — v1
#
# Fetched by an instance's `onstart` and run there. It installs ComfyUI plus
# comfy-portal-endpoint, clones the template's extensions, and downloads its
# models. Workflows are NOT handled here — the app pushes those over
# /cpe/workflow/save once the instance answers, which also keeps them out of
# onstart's 4048-character budget.
#
# Inputs (environment, set by the app through vast's `env` field):
#   MODELS           newline-separated "<folder>|<url>[|<filename>]"
#   EXTENSIONS       newline-separated git URLs
#   HF_TOKEN         optional, for gated HuggingFace repos
#   CIVITAI_API_KEY  optional, for gated Civitai downloads
#   COMFY_PORT       defaults to 8188
#
# Everything below that looks over-careful is: each line is a failure someone
# has already hit.

set -uo pipefail

COMFY_DIR="${COMFY_DIR:-/workspace/ComfyUI}"
COMFY_PORT="${COMFY_PORT:-8188}"
LOG=/workspace/bootstrap.log
MAX_PARALLEL_DL="${MAX_PARALLEL_DL:-4}"

mkdir -p /workspace
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
fail() { log "ERROR: $*"; exit 1; }

# ---------------------------------------------------------------- packages --
log "installing base packages"
export DEBIAN_FRONTEND=noninteractive
need=()
for p in git curl aria2 python3-venv; do command -v "${p%%-*}" >/dev/null 2>&1 || need+=("$p"); done
command -v aria2c >/dev/null 2>&1 || need+=(aria2)
if [ "${#need[@]}" -gt 0 ]; then
  apt-get update -qq >>"$LOG" 2>&1
  apt-get install -y -qq "${need[@]}" >>"$LOG" 2>&1 || fail "apt install failed"
fi

# ------------------------------------------------------------- disk check ---
# Sum the sizes up front. Running out halfway leaves a half-downloaded model
# that ComfyUI will happily try to load, on a GPU that has been billing since
# the instance started.
if [ -n "${MODELS:-}" ]; then
  total=0
  while IFS='|' read -r folder url fname; do
    [ -z "${folder// }" ] && continue
    case "$folder" in \#*) continue ;; esac
    case "$url" in
      *civitai.com*) sz=$(curl -sIL ${CIVITAI_API_KEY:+-H "Authorization: Bearer $CIVITAI_API_KEY"} -A "Mozilla/5.0" "$url" 2>/dev/null | grep -i '^content-length' | tail -1 | tr -dc '0-9') ;;
      *) sz=$(curl -sIL ${HF_TOKEN:+-H "Authorization: Bearer $HF_TOKEN"} "$url" 2>/dev/null | grep -iE '^(x-linked-size|content-length)' | tail -1 | tr -dc '0-9') ;;
    esac
    total=$(( total + ${sz:-0} ))
  done <<<"$MODELS"
  avail=$(df --output=avail -B1 /workspace 2>/dev/null | tail -1 | tr -dc '0-9')
  log "models total ~$(( total / 1024 / 1024 / 1024 ))GiB, free $(( ${avail:-0} / 1024 / 1024 / 1024 ))GiB"
  if [ "$total" -gt 0 ] && [ "$total" -gt "${avail:-0}" ]; then
    fail "not enough disk for the models — relaunch with a larger disk"
  fi
fi

# --------------------------------------------------- downloads start first --
# Kicked off before torch so the two overlap. vast has no persistent volume, so
# every launch re-downloads everything and this is the step that sets the clock.
download_models() {
  [ -z "${MODELS:-}" ] && return 0
  local par=0
  while IFS='|' read -r folder url fname; do
    [ -z "${folder// }" ] && continue
    case "$folder" in \#*) continue ;; esac
    folder="${folder// }"; fname="${fname//[$' \r']}"
    local dest="$COMFY_DIR/models/$folder"
    local base="${fname:-$(basename "$url")}"
    if [ -f "$dest/$base" ]; then log "skip $base (present)"; continue; fi

    (
      mkdir -p "$dest"; cd "$dest" || exit 1
      case "$url" in
        *civitai.com*)
          # Resolve the redirect with curl first, then fetch the bare signed URL
          # with no headers at all. Civitai redirects to a B2- or R2-backed
          # signed URL depending on the asset, and aria2 applies --header across
          # redirects unconditionally: B2 tolerates the stray Authorization, R2
          # rejects it with a flat 400 because its signature covers only `host`.
          # Resolving first sidesteps both and keeps full -x16 parallelism
          # instead of dropping to a single connection.
          until signed=$(curl -s -o /dev/null -w '%{redirect_url}' \
                  ${CIVITAI_API_KEY:+-H "Authorization: Bearer $CIVITAI_API_KEY"} \
                  -A "Mozilla/5.0" "$url") && [ -n "$signed" ] &&
                aria2c -x16 -s16 -k1M -c --file-allocation=none --max-tries=0 \
                  --retry-wait=5 -o "$base" "$signed" >>"$LOG" 2>&1
          do sleep 5; done
          ;;
        *)
          # Append with >> rather than piping through tee: a pipe returns tee's
          # exit status, which is always 0, so `until` would read a failed
          # download as success and leave a truncated file behind.
          until aria2c -x16 -s16 -k1M -c --file-allocation=none --max-tries=0 \
                  --retry-wait=5 ${HF_TOKEN:+--header="Authorization: Bearer $HF_TOKEN"} \
                  -o "$base" "$url" >>"$LOG" 2>&1
          do sleep 5; done
          ;;
      esac
      log "downloaded $base"
    ) &

    par=$(( par + 1 ))
    # One host will throttle a single stream well below the box's uplink, so
    # run several files at once — but not all of them, or they compete.
    if [ "$par" -ge "$MAX_PARALLEL_DL" ]; then wait; par=0; fi
  done <<<"$MODELS"
  wait
}

log "starting model downloads"
download_models &
DOWNLOADS_PID=$!

# ----------------------------------------------------------------- ComfyUI --
if [ ! -d "$COMFY_DIR" ]; then
  log "cloning ComfyUI"
  git clone --depth 1 https://github.com/comfyanonymous/ComfyUI "$COMFY_DIR" >>"$LOG" 2>&1 \
    || fail "ComfyUI clone failed"
fi

cd "$COMFY_DIR" || fail "no $COMFY_DIR"
[ -d venv ] || python3 -m venv venv >>"$LOG" 2>&1
# shellcheck disable=SC1091
source venv/bin/activate

log "installing torch (cu128)"
pip install -q --upgrade pip >>"$LOG" 2>&1
pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128 >>"$LOG" 2>&1 \
  || fail "torch install failed"
pip install -q -r requirements.txt >>"$LOG" 2>&1 || fail "ComfyUI requirements failed"

# --------------------------------------------------------------- extensions --
mkdir -p "$COMFY_DIR/custom_nodes"
cd "$COMFY_DIR/custom_nodes" || fail "no custom_nodes"

# Manager and the endpoint the app talks to are always installed: without the
# endpoint the app can't push workflows once this finishes.
for repo in \
  https://github.com/ltdrdata/ComfyUI-Manager \
  https://github.com/ShunL12324/comfy-portal-endpoint \
  ${EXTENSIONS:-}
do
  [ -z "${repo// }" ] && continue
  name=$(basename "$repo" .git)
  [ -d "$name" ] && { log "skip $name (present)"; continue; }
  log "cloning $name"
  git clone --depth 1 "$repo" "$name" >>"$LOG" 2>&1 || { log "WARN clone failed: $repo"; continue; }
  # A node whose deps fail shouldn't take the whole instance down with it.
  [ -f "$name/requirements.txt" ] && pip install -q -r "$name/requirements.txt" >>"$LOG" 2>&1 \
    || true
done

# ------------------------------------------------------------------- start --
log "waiting for downloads"
wait "$DOWNLOADS_PID" 2>/dev/null || true

cd "$COMFY_DIR" || exit 1
log "starting ComfyUI on :$COMFY_PORT"
nohup venv/bin/python main.py --listen 0.0.0.0 --port "$COMFY_PORT" >>/workspace/comfyui.log 2>&1 &

log "bootstrap complete"
