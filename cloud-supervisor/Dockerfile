# Comfy Portal runtime image.
#
# Everything that used to be installed on the rented machine at boot — apt,
# git clone, pip, torch — is baked in here instead. vast has no persistent
# volume, so the old script repeated all of it on every launch, on an arbitrary
# host, with the GPU billing the whole time. That was the largest source of
# both failures and cost, and none of it could be reproduced locally.
#
# What stays at runtime is only what genuinely varies per launch: the template's
# models, its extensions, and its Ollama models.
#
# Versions are pinned. A rented instance should get the exact stack that was
# tested, not whatever master happened to be that morning.

ARG CUDA_TAG=12.8.1-cudnn-devel-ubuntu22.04
FROM nvidia/cuda:${CUDA_TAG}

# devel rather than runtime: custom nodes routinely build CUDA extensions on
# install, and the few GB saved by runtime get paid back as compile failures on
# a machine the user is paying for by the second.

ARG COMFYUI_REF=v0.34.0
ARG MANAGER_REF=f39cbd56fecae0b27a446c0cd450cd591f3a8bea
ARG ENDPOINT_REF=63dcd2678996634d082d5a7bbfee957cce087d6e
ARG TORCH_INDEX=https://download.pytorch.org/whl/cu128

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1 \
    COMFY_DIR=/opt/comfyui \
    CP_WORKSPACE=/workspace \
    COMFY_PORT=8188 \
    CP_PORT=8189

RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends \
        python3 python3-venv python3-pip \
        git curl ca-certificates aria2 \
        libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/comfyui/venv
ENV PATH=/opt/comfyui/venv/bin:$PATH

# torch first and on its own layer: it is by far the largest install, and
# keeping it separate means a ComfyUI bump doesn't re-download 3 GB of wheels.
RUN pip install --upgrade pip && \
    pip install torch torchvision torchaudio --index-url ${TORCH_INDEX}

RUN git clone --depth 1 --branch ${COMFYUI_REF} \
        https://github.com/Comfy-Org/ComfyUI /tmp/comfyui && \
    cp -a /tmp/comfyui/. /opt/comfyui/ && \
    rm -rf /tmp/comfyui /opt/comfyui/.git && \
    pip install -r /opt/comfyui/requirements.txt

# ComfyUI-Manager, and the endpoint node the app's /cpe/* calls depend on —
# without the latter the app cannot push workflows once the instance answers.
RUN mkdir -p /opt/comfyui/custom_nodes && \
    git clone https://github.com/Comfy-Org/ComfyUI-Manager \
        /opt/comfyui/custom_nodes/ComfyUI-Manager && \
    git -C /opt/comfyui/custom_nodes/ComfyUI-Manager checkout -q ${MANAGER_REF} && \
    git clone https://github.com/ShunL12324/comfy-portal-endpoint \
        /opt/comfyui/custom_nodes/comfy-portal-endpoint && \
    git -C /opt/comfyui/custom_nodes/comfy-portal-endpoint checkout -q ${ENDPOINT_REF} && \
    for req in /opt/comfyui/custom_nodes/*/requirements.txt; do \
        [ -f "$req" ] && pip install -r "$req" || true; \
    done

COPY supervisor.py /opt/cp/supervisor.py

# Fail the build rather than the rental if the stack is broken.
RUN python -c "import torch, sys; print('torch', torch.__version__)" && \
    python -c "import ast, sys; ast.parse(open('/opt/cp/supervisor.py').read())"

EXPOSE 8188 8189
ENTRYPOINT ["python", "/opt/cp/supervisor.py"]
