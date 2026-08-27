# Test rig for supervisor.py.
#
# Deliberately not the real runtime image: this has no CUDA and no torch, so it
# builds in seconds and the supervisor's own logic can be iterated on without waiting
# for a 15 GiB image. ComfyUI is replaced by a stub that answers /system_stats,
# which is the only thing the supervisor checks for.
FROM ubuntu:22.04

RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends python3 aria2 git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Mirrors the real image's layout: code and venv baked in, /workspace mounted.
RUN mkdir -p /opt/comfyui/venv/bin /opt/comfyui/custom_nodes/ComfyUI-Manager /workspace && \
    ln -s /usr/bin/python3 /opt/comfyui/venv/bin/python

COPY test/fake-comfyui.py /opt/comfyui/main.py
COPY test/entrypoint.sh /entrypoint.sh
COPY supervisor.py /opt/cp/supervisor.py
RUN chmod +x /entrypoint.sh

ENV COMFY_DIR=/opt/comfyui \
    CP_WORKSPACE=/workspace \
    COMFY_PORT=8188 \
    CP_PORT=8189

EXPOSE 8188 8189
ENTRYPOINT ["/entrypoint.sh"]
