# ComfyUI API Reference

> **Last updated:** Based on ComfyUI source code from the `comfyanonymous/ComfyUI` repository (master branch).
> This document covers all HTTP endpoints and WebSocket message types exposed by the ComfyUI server.

---

## Table of Contents

1. [Overview](#1-overview)
2. [HTTP API Endpoints](#2-http-api-endpoints)
   - [Workflow Execution](#21-workflow-execution)
   - [Queue Management](#22-queue-management)
   - [History](#23-history)
   - [Jobs API](#24-jobs-api)
   - [Image & File Management](#25-image--file-management)
   - [Models & Resources](#26-models--resources)
   - [System Information](#27-system-information)
   - [Internal Routes](#28-internal-routes)
3. [WebSocket API](#3-websocket-api)
   - [Connection](#31-connection)
   - [Feature Flags Negotiation](#32-feature-flags-negotiation)
   - [JSON Message Types](#33-json-message-types)
   - [Binary Message Types](#34-binary-message-types)
   - [Message Flow](#35-typical-message-flow)
4. [Common Usage Scenarios](#4-common-usage-scenarios)
5. [Usage in comfy-portal](#5-usage-in-comfy-portal)

---

## 1. Overview

### Base URL

ComfyUI runs an HTTP/WebSocket server (powered by `aiohttp`). The default address is:

```
http://127.0.0.1:8188
```

The host, port, and TLS settings are configurable via CLI arguments. When TLS is enabled (`--tls-keyfile` and `--tls-certfile`), the scheme becomes `https` / `wss`.

### Authentication

ComfyUI does **not** have built-in authentication in the open-source version. However, many deployments (including cloud-hosted instances) add token-based authentication via reverse proxies or custom middleware.

The common pattern used by comfy-portal and other clients:

- **Query parameter:** `?token=<TOKEN>` appended to URLs
- **Header:** `Authorization: Bearer <TOKEN>`

### Content Types

- Most endpoints accept and return `application/json`.
- File upload endpoints (`/upload/image`, `/upload/mask`) use `multipart/form-data`.
- The `/view` endpoint returns image/file data with appropriate MIME types.

### CORS & Security Middleware

The server includes several optional middleware layers:

| Middleware | Purpose |
|---|---|
| **CORS** | Configurable origin validation for cross-origin requests |
| **Origin-only** | Prevents cross-origin POST exploitation on localhost |
| **CSP** | Restricts script/style/image sources |
| **Compression** | Optional gzip for JSON/text responses |
| **Cache Control** | Static asset caching headers |

---

## 2. HTTP API Endpoints

### 2.1 Workflow Execution

#### `POST /prompt` — Queue a Workflow for Execution

Submits a workflow (prompt) to the execution queue.

**Request Body:**

```json
{
  "prompt": { ... },
  "client_id": "string (optional — ties WebSocket updates to this client)",
  "prompt_id": "string (optional — custom UUID; auto-generated if omitted)",
  "number": 0.0,
  "front": false,
  "extra_data": {
    "extra_pnginfo": { ... }
  },
  "partial_execution_targets": []
}
```

| Field | Type | Description |
|---|---|---|
| `prompt` | `object` | **Required.** The workflow graph — a dict of node ID → node definition. |
| `client_id` | `string` | Associates this prompt with a WebSocket session for targeted progress updates. |
| `prompt_id` | `string` | Custom prompt ID. If omitted, a UUID is generated. |
| `number` | `float` | Priority number. Lower numbers execute first. |
| `front` | `boolean` | If `true`, the prompt is placed at the front of the queue (negative priority). |
| `extra_data` | `object` | Additional metadata (e.g., PNG info for embedding in output images). |
| `partial_execution_targets` | `array` | List of specific output nodes to execute (partial execution). |

**Success Response (200):**

```json
{
  "prompt_id": "abc123-...",
  "number": 1.0,
  "node_errors": {}
}
```

**Error Response (400):**

```json
{
  "error": {
    "type": "no_prompt",
    "message": "No prompt provided",
    "details": "No prompt provided",
    "extra_info": {}
  },
  "node_errors": {
    "node_id": [ ... ]
  }
}
```

#### `GET /prompt` — Get Queue Info

Returns a summary of the current queue status.

**Response:**

```json
{
  "exec_info": {
    "queue_remaining": 3
  }
}
```

#### `POST /interrupt` — Interrupt Execution

Interrupts the currently running generation. Optionally targets a specific prompt.

**Request Body (optional):**

```json
{
  "prompt_id": "abc123-... (optional — if omitted, interrupts globally)"
}
```

**Response:** `200 OK` (empty body)

**Behavior:**
- If `prompt_id` is provided, only interrupts if that prompt is currently running.
- If `prompt_id` is omitted or body is empty, performs a global interrupt.

#### `POST /free` — Free Memory / Unload Models

Triggers memory cleanup and/or model unloading.

**Request Body:**

```json
{
  "unload_models": true,
  "free_memory": true
}
```

| Field | Type | Description |
|---|---|---|
| `unload_models` | `boolean` | Unload all loaded models from VRAM/RAM. |
| `free_memory` | `boolean` | Trigger garbage collection and memory cleanup. |

**Response:** `200 OK`

---

### 2.2 Queue Management

#### `GET /queue` — Get Current Queue

Returns the currently running and pending items in the queue.

**Response:**

```json
{
  "queue_running": [
    [priority, "prompt_id", { "...prompt" : "..." }, { "...extra_data": "..." }, ["...outputs_to_execute"]]
  ],
  "queue_pending": [
    [priority, "prompt_id", { "...prompt": "..." }, { "...extra_data": "..." }, ["...outputs_to_execute"]]
  ]
}
```

> Note: Sensitive data (e.g., auth tokens) is stripped from the response.

#### `POST /queue` — Clear or Delete Queue Items

**Request Body:**

To clear the entire queue:
```json
{ "clear": true }
```

To delete specific items:
```json
{ "delete": ["prompt_id_1", "prompt_id_2"] }
```

| Field | Type | Description |
|---|---|---|
| `clear` | `boolean` | If `true`, wipes the entire pending queue. |
| `delete` | `string[]` | Array of prompt IDs to remove from the queue. |

**Response:** `200 OK`

---

### 2.3 History

#### `GET /history` — Get Execution History

Returns past execution results.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `max_items` | `int` | Maximum number of history items to return. |
| `offset` | `int` | Offset for pagination (default: `-1` meaning from the end). |

**Response:**

```json
{
  "prompt_id_1": {
    "prompt": [1.0, "prompt_id_1", { "...prompt": "..." }, { "...extra_data": "..." }, ["...outputs"]],
    "outputs": {
      "node_id": {
        "images": [
          { "filename": "ComfyUI_00001_.png", "subfolder": "", "type": "output" }
        ]
      }
    },
    "status": {
      "status_str": "success",
      "completed": true,
      "messages": [
        ["execution_start", { "prompt_id": "..." }],
        ["execution_cached", { "nodes": ["..."], "prompt_id": "..." }],
        ["execution_success", { "prompt_id": "..." }]
      ]
    }
  }
}
```

#### `GET /history/{prompt_id}` — Get History for Specific Prompt

Returns the history entry for a single prompt.

**Response:** Same structure as above, but only containing the requested prompt ID.

#### `POST /history` — Clear or Delete History

**Request Body:**

To clear all history:
```json
{ "clear": true }
```

To delete specific entries:
```json
{ "delete": ["prompt_id_1", "prompt_id_2"] }
```

**Response:** `200 OK`

---

### 2.4 Jobs API

A higher-level abstraction over queue and history, providing a unified view of all jobs.

#### `GET /api/jobs` — List Jobs

Returns a paginated, filterable list of all jobs (pending, running, completed, failed, cancelled).

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | `string` | — | Comma-separated filter: `pending`, `in_progress`, `completed`, `failed`, `cancelled` |
| `workflow_id` | `string` | — | Filter by workflow ID |
| `sort_by` | `string` | `created_at` | Sort field: `created_at` or `execution_duration` |
| `sort_order` | `string` | `desc` | Sort direction: `asc` or `desc` |
| `limit` | `int` | — | Maximum items to return (positive integer) |
| `offset` | `int` | `0` | Items to skip (non-negative integer) |

**Response (200):**

```json
{
  "jobs": [
    {
      "id": "prompt_id",
      "status": "completed",
      "priority": 1.0,
      "created_at": 1700000000000,
      "workflow_id": "...",
      "execution_duration": 12.5,
      "outputs": {}
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 10,
    "total": 42,
    "has_more": true
  }
}
```

**Job Status Values:**

| Status | Description |
|---|---|
| `pending` | Queued, waiting to execute |
| `in_progress` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Finished with an error |
| `cancelled` | Interrupted / cancelled |

#### `GET /api/jobs/{job_id}` — Get Single Job

Returns a single job by its ID (prompt ID).

**Response (200):** Single job object (same structure as items in the `jobs` array above).

**Error (404):**

```json
{ "error": "Job not found" }
```

---

### 2.5 Image & File Management

#### `POST /upload/image` — Upload an Image

Uploads an image file to the server's input/temp/output directory.

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `image` | `file` | **Required.** The image file to upload. |
| `type` | `string` | Directory type: `input` (default), `temp`, or `output`. |
| `subfolder` | `string` | Subfolder within the directory. |
| `overwrite` | `string` | `"true"` or `"1"` to overwrite existing files. |

**Response (200):**

```json
{
  "name": "uploaded_image.png",
  "subfolder": "",
  "type": "input"
}
```

**Error:** `400` if no image provided or invalid path.

#### `POST /upload/mask` — Upload a Mask

Uploads a mask image and composites its alpha channel onto an existing image.

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `image` | `file` | **Required.** The mask image file. |
| `original_ref` | `string` | **Required.** JSON string referencing the original image: `{"filename": "...", "type": "input", "subfolder": ""}` |
| `type` | `string` | Directory type (default: `input`). |
| `subfolder` | `string` | Subfolder within the directory. |
| `overwrite` | `string` | `"true"` to overwrite. |

**Response (200):** Same structure as `/upload/image`.

#### `GET /view` — View/Download an Image or File

Retrieves an image or file from the server. Supports on-the-fly format conversion and preview generation.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `filename` | `string` | **Required.** The filename to retrieve. |
| `type` | `string` | Directory type: `output` (default), `input`, `temp`. |
| `subfolder` | `string` | Subfolder path. |
| `preview` | `string` | Preview format and quality, e.g., `webp;90` or `jpeg;80`. |
| `channel` | `string` | Channel extraction: `rgba` (default), `rgb`, or `a` (alpha only). |

**Response:** Binary file data with appropriate `Content-Type` header.

**Behavior:**
- If `preview` is specified, the image is converted to the requested format with the given quality.
- If `channel=rgb`, the alpha channel is stripped.
- If `channel=a`, only the alpha channel is returned as an RGBA PNG.
- Security-sensitive MIME types (HTML, JS, CSS) are forced to `application/octet-stream`.

**Error Codes:**
- `400` — Missing filename or invalid path
- `403` — Path traversal attempt
- `404` — File not found

#### `GET /view_metadata/{folder_name}` — Get SafeTensors Metadata

Retrieves the `__metadata__` section from a `.safetensors` model file.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `folder_name` | The model folder type (e.g., `checkpoints`, `loras`). |

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `filename` | `string` | **Required.** The `.safetensors` filename. |

**Response (200):** JSON object containing the metadata key-value pairs.

**Error:** `404` if folder, file, or metadata not found.

---

### 2.6 Models & Resources

#### `GET /models` — List Model Folder Types

Returns a list of all registered model folder names.

**Response:**

```json
["checkpoints", "loras", "vae", "clip", "controlnet", "embeddings", "upscale_models"]
```

#### `GET /models/{folder}` — List Models in a Folder

Returns a list of filenames in the specified model folder.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `folder` | The model folder type (e.g., `checkpoints`). |

**Response (200):**

```json
["v1-5-pruned-emaonly.safetensors", "sd_xl_base_1.0.safetensors"]
```

**Error:** `404` if folder type doesn't exist.

#### `GET /embeddings` — List Embeddings

Returns a list of available embedding names (without file extensions).

**Response:**

```json
["EasyNegative", "bad-hands-5"]
```

#### `GET /extensions` — List Extensions

Returns a list of JavaScript extension file paths.

**Response:**

```json
["/extensions/core/colorPalette.js", "/extensions/core/keybinds.js"]
```

#### `GET /object_info` — Get All Node Definitions

Returns the complete schema for all registered nodes, including their inputs, outputs, and metadata.

**Response:**

```json
{
  "KSampler": {
    "input": {
      "required": {
        "model": ["MODEL"],
        "seed": ["INT", { "default": 0, "min": 0, "max": 18446744073709551615 }],
        "steps": ["INT", { "default": 20, "min": 1, "max": 10000 }],
        "cfg": ["FLOAT", { "default": 8.0, "min": 0.0, "max": 100.0 }],
        "sampler_name": [["euler", "euler_ancestral", "heun"]],
        "scheduler": [["normal", "karras", "exponential"]],
        "positive": ["CONDITIONING"],
        "negative": ["CONDITIONING"],
        "latent_image": ["LATENT"]
      },
      "optional": {}
    },
    "input_order": { "required": ["model", "seed", "steps", "cfg", "sampler_name", "scheduler", "positive", "negative", "latent_image"] },
    "output": ["LATENT"],
    "output_is_list": [false],
    "output_name": ["LATENT"],
    "name": "KSampler",
    "display_name": "KSampler",
    "description": "",
    "category": "sampling",
    "output_node": false,
    "python_module": "nodes",
    "deprecated": false,
    "experimental": false
  }
}
```

**Node Info Fields:**

| Field | Type | Description |
|---|---|---|
| `input` | `object` | Input definitions grouped by `required`, `optional`, `hidden`. |
| `input_order` | `object` | Ordered list of input names per group. |
| `output` | `string[]` | Output type names. |
| `output_is_list` | `boolean[]` | Whether each output is a list. |
| `output_name` | `string[]` | Display names for outputs. |
| `name` | `string` | Internal class name. |
| `display_name` | `string` | Human-readable name. |
| `description` | `string` | Node description. |
| `category` | `string` | Node category for UI grouping. |
| `output_node` | `boolean` | Whether this is a terminal/output node. |
| `python_module` | `string` | Source module. |
| `deprecated` | `boolean` | Whether the node is deprecated. |
| `experimental` | `boolean` | Whether the node is experimental. |
| `api_node` | `boolean` | Whether the node is an API node (if present). |
| `search_aliases` | `string[]` | Alternative search terms. |

#### `GET /object_info/{node_class}` — Get Single Node Definition

Returns the schema for a specific node class.

**Response:** Same structure as above, but only containing the requested node.

---

### 2.7 System Information

#### `GET /system_stats` — Get System Statistics

Returns system and hardware information.

**Response:**

```json
{
  "system": {
    "os": "linux",
    "ram_total": 34359738368,
    "ram_free": 16000000000,
    "comfyui_version": "0.3.10",
    "required_frontend_version": "1.17.0",
    "installed_templates_version": "0.1.0",
    "required_templates_version": "0.1.0",
    "python_version": "3.11.5 ...",
    "pytorch_version": "2.1.0+cu121",
    "embedded_python": false,
    "argv": ["main.py", "--listen"]
  },
  "devices": [
    {
      "name": "NVIDIA GeForce RTX 4090",
      "type": "cuda",
      "index": 0,
      "vram_total": 25769803776,
      "vram_free": 20000000000,
      "torch_vram_total": 25769803776,
      "torch_vram_free": 20000000000
    }
  ]
}
```

#### `GET /features` — Get Server Feature Flags

Returns the server's capability flags for protocol negotiation.

**Response:**

```json
{
  "supports_preview_metadata": true,
  "max_upload_size": 104857600,
  "extension": {
    "manager": {
      "supports_v4": true
    }
  }
}
```

---

### 2.8 Internal Routes

These routes are under the `/internal/` prefix and are primarily used by the ComfyUI frontend.

#### `GET /internal/logs` — Get Formatted Logs

Returns formatted log entries as JSON.

#### `GET /internal/logs/raw` — Get Raw Logs

Returns raw log entries with terminal size information.

#### `PATCH /internal/logs/subscribe` — Subscribe to Logs

Manages client log subscriptions (enable/disable).

#### `GET /internal/folder_paths` — Get Folder Paths

Returns the configured folder paths for models, outputs, etc.

#### `GET /internal/files/{directory_type}` — List Files in Directory

Lists files from a specified directory.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `directory_type` | One of: `output`, `input`, `temp`. |

**Response:** JSON array of file objects, sorted by modification time (descending). Hidden files (e.g., `.DS_Store`) are filtered out.

**Error:** `400` if `directory_type` is invalid.

---

## 3. WebSocket API

### 3.1 Connection

**Endpoint:** `ws://<host>:<port>/ws`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `clientId` | `string` | Optional. Reuse an existing session ID. If omitted, a new session ID is generated by the server. |

**Connection URL Examples:**

```
ws://127.0.0.1:8188/ws?clientId=abc123
wss://my-server.com:443/ws?clientId=abc123&token=mytoken
```

**Initial Message from Server:**

Upon connection, the server immediately sends a `status` message:

```json
{
  "type": "status",
  "data": {
    "status": {
      "exec_info": {
        "queue_remaining": 0
      }
    },
    "sid": "generated-session-id"
  }
}
```

**Reconnection Behavior:**

If the client reconnects with the same `clientId` while a prompt is executing for that client, the server sends the current `executing` state:

```json
{
  "type": "executing",
  "data": {
    "node": "current_node_id"
  }
}
```

### 3.2 Feature Flags Negotiation

The first message sent by the client should be a feature flags message to negotiate capabilities:

**Client → Server:**

```json
{
  "type": "feature_flags",
  "data": {
    "supports_preview_metadata": true
  }
}
```

**Server → Client (response):**

```json
{
  "type": "feature_flags",
  "data": {
    "supports_preview_metadata": true,
    "max_upload_size": 104857600,
    "extension": { "manager": { "supports_v4": true } }
  }
}
```

**Known Feature Flags:**

| Flag | Type | Description |
|---|---|---|
| `supports_preview_metadata` | `boolean` | Client supports `PREVIEW_IMAGE_WITH_METADATA` binary messages. If `false`, server sends legacy `PREVIEW_IMAGE` format instead. |

### 3.3 JSON Message Types

All JSON messages follow this structure:

```json
{
  "type": "<message_type>",
  "data": { ... }
}
```

#### `status` — Queue Status Update

Sent whenever the queue state changes (item added, completed, etc.). **Broadcast to all clients.**

```json
{
  "type": "status",
  "data": {
    "status": {
      "exec_info": {
        "queue_remaining": 2
      }
    }
  }
}
```

#### `execution_start` — Execution Started

Sent when a prompt begins execution. **Only sent to the initiating client.**

```json
{
  "type": "execution_start",
  "data": {
    "prompt_id": "abc123-...",
    "timestamp": 1700000000000
  }
}
```

#### `execution_cached` — Cached Nodes Notification

Sent after `execution_start` to indicate which nodes have cached results and will be skipped. **Only sent to the initiating client.**

```json
{
  "type": "execution_cached",
  "data": {
    "nodes": ["1", "2", "5"],
    "prompt_id": "abc123-...",
    "timestamp": 1700000000000
  }
}
```

#### `executing` — Node Execution Started

Sent when a node begins executing. **Only sent to the initiating client.**

```json
{
  "type": "executing",
  "data": {
    "node": "3",
    "display_node": "3",
    "prompt_id": "abc123-..."
  }
}
```

When `node` is `null`, it signals that the entire prompt has finished executing:

```json
{
  "type": "executing",
  "data": {
    "node": null,
    "prompt_id": "abc123-..."
  }
}
```

#### `progress` — Sampler/Node Progress

Sent during node execution (typically KSampler) to report step progress. **Only sent to the initiating client.**

```json
{
  "type": "progress",
  "data": {
    "value": 15,
    "max": 20,
    "prompt_id": "abc123-...",
    "node": "3"
  }
}
```

> Note: Progress updates are throttled — they are only sent when at least a minimum time interval has passed AND a minimum percentage change has occurred. First and final updates are always sent immediately.

#### `progress_state` — Comprehensive Progress State

A newer message type that sends the state of all active nodes at once. Sent alongside `progress` messages. **Only sent to the initiating client.**

```json
{
  "type": "progress_state",
  "data": {
    "prompt_id": "abc123-...",
    "nodes": {
      "3": {
        "value": 15,
        "max": 20,
        "state": "running",
        "node_id": "3",
        "prompt_id": "abc123-...",
        "display_node_id": "3",
        "parent_node_id": null,
        "real_node_id": "3"
      }
    }
  }
}
```

**Node State Values:** `"pending"`, `"running"`, `"finished"`, `"error"`

#### `executed` — Node Output Available

Sent when a node produces UI output (e.g., images). **Only sent to the initiating client.**

```json
{
  "type": "executed",
  "data": {
    "node": "7",
    "display_node": "7",
    "output": {
      "images": [
        { "filename": "ComfyUI_00001_.png", "subfolder": "", "type": "output" }
      ]
    },
    "prompt_id": "abc123-..."
  }
}
```

The `output` field can contain various media types depending on the node:
- `images` — Generated images
- `gifs` — Animated GIFs
- `videos` — Video files
- `audio` — Audio files

#### `execution_success` — Execution Completed Successfully

Sent when the entire prompt finishes without errors. **Only sent to the initiating client.**

```json
{
  "type": "execution_success",
  "data": {
    "prompt_id": "abc123-...",
    "timestamp": 1700000000000
  }
}
```

#### `execution_error` — Execution Error

Sent when a node encounters an error during execution. **Only sent to the initiating client.**

```json
{
  "type": "execution_error",
  "data": {
    "prompt_id": "abc123-...",
    "node_id": "3",
    "node_type": "KSampler",
    "executed": ["1", "2"],
    "exception_message": "CUDA out of memory...",
    "exception_type": "RuntimeError",
    "traceback": ["..."],
    "current_inputs": [],
    "current_outputs": ["1", "2"],
    "timestamp": 1700000000000
  }
}
```

#### `execution_interrupted` — Execution Interrupted

Sent when execution is interrupted (via `/interrupt`). **Broadcast to all clients.**

```json
{
  "type": "execution_interrupted",
  "data": {
    "prompt_id": "abc123-...",
    "node_id": "3",
    "node_type": "KSampler",
    "executed": ["1", "2"],
    "timestamp": 1700000000000
  }
}
```

### 3.4 Binary Message Types

Binary messages are prefixed with a 4-byte big-endian unsigned integer indicating the event type.

**Binary Frame Format:**

```
[4 bytes: event type (big-endian uint32)] [payload bytes...]
```

#### Type 1: `PREVIEW_IMAGE`

A preview image generated during sampling (e.g., latent preview). Sent when the client does NOT support `supports_preview_metadata`, or as a fallback.

**Payload Format:**

```
[4 bytes: image format type (big-endian uint32)] [image data bytes...]
```

Image format types:
- `1` = JPEG
- `2` = PNG

#### Type 3: `TEXT`

Progress text with an associated node ID.

**Payload Format:**

```
[4 bytes: node_id length N (big-endian uint32)] [N bytes: node_id (UTF-8)] [remaining bytes: text (UTF-8)]
```

#### Type 4: `PREVIEW_IMAGE_WITH_METADATA`

A preview image with JSON metadata. Only sent if the client has negotiated `supports_preview_metadata: true` via feature flags.

**Payload Format:**

```
[4 bytes: metadata JSON length M (big-endian uint32)] [M bytes: metadata JSON (UTF-8)] [remaining bytes: image data]
```

**Metadata JSON structure:**

```json
{
  "node_id": "3",
  "prompt_id": "abc123-...",
  "display_node_id": "3",
  "parent_node_id": null,
  "real_node_id": "3",
  "image_type": "image/jpeg"
}
```

> **Note:** `UNENCODED_PREVIEW_IMAGE` (type 2) is used internally and converted to type 1 before sending over the wire. Clients should only expect to receive types 1, 3, and 4.

### 3.5 Typical Message Flow

Below is the typical sequence of WebSocket messages during a successful image generation:

```
Client                                    Server
  |                                         |
  |--- Connect to /ws?clientId=xxx -------->|
  |<-- status (queue info + sid) -----------|
  |--- feature_flags ---------------------->|
  |<-- feature_flags (server caps) ---------|
  |                                         |
  |--- POST /prompt (HTTP) ---------------->|
  |<-- { prompt_id, number } (HTTP) --------|
  |                                         |
  |<-- status (queue_remaining updated) ----|
  |<-- execution_start --------------------|
  |<-- execution_cached (cached nodes) -----|
  |<-- executing (node "1" starts) ---------|
  |<-- executing (node "2" starts) ---------|
  |<-- executing (node "3" starts) ---------|
  |<-- progress { value: 1, max: 20 } -----|
  |<-- progress_state { nodes: {...} } -----|
  |<-- [BINARY: PREVIEW_IMAGE] -------------|  (if preview enabled)
  |<-- progress { value: 2, max: 20 } -----|
  |<-- ...                                  |
  |<-- progress { value: 20, max: 20 } ----|
  |<-- executing (node "7" starts) ---------|
  |<-- executed (node "7" output) ----------|
  |<-- executing (node: null) --------------|  <-- signals completion
  |<-- execution_success -------------------|
  |<-- status (queue_remaining updated) ----|
  |                                         |
  |--- GET /history/{prompt_id} (HTTP) ---->|
  |<-- { outputs: { images: [...] } } ------|
  |                                         |
  |--- GET /view?filename=... (HTTP) ------>|
  |<-- [image binary data] -----------------|
```

**Error Flow:**

```
  |<-- execution_start ---------------------|
  |<-- executing (node "3" starts) ---------|
  |<-- execution_error { exception_message } |
  |<-- status (queue_remaining updated) ----|
```

**Interrupt Flow:**

```
  |--- POST /interrupt (HTTP) ------------->|
  |<-- execution_interrupted ---------------|
  |<-- status (queue_remaining updated) ----|
```

---

## 4. Common Usage Scenarios

### 4.1 Queue a Workflow and Track Progress

1. **Connect** to WebSocket at `/ws?clientId=<uuid>`.
2. **Send feature flags** (optional but recommended for preview support).
3. **POST** the workflow to `/prompt` with `client_id` matching the WebSocket `clientId`.
4. **Listen** for WebSocket messages:
   - `execution_start` — generation has begun
   - `progress` — sampler step progress (update progress bar)
   - `executing` with `node: null` — generation complete
   - `execution_error` / `execution_interrupted` — handle error or cancellation
5. **GET** `/history/{prompt_id}` to retrieve output file references.
6. **GET** `/view?filename=...&type=output` to download generated images.

### 4.2 Upload an Image for img2img

1. **POST** the image to `/upload/image` with `type=input`.
2. Use the returned `name` in the workflow's `LoadImage` node:
   ```json
   { "class_type": "LoadImage", "inputs": { "image": "uploaded_image.png" } }
   ```

### 4.3 Cancel a Running Generation

1. **POST** to `/interrupt` with `{ "prompt_id": "<id>" }` for targeted cancellation.
2. Or **POST** to `/interrupt` with `{}` for global cancellation.
3. Listen for `execution_interrupted` on WebSocket.

### 4.4 Get Available Models

1. **GET** `/models` to list all model folder types.
2. **GET** `/models/checkpoints` to list checkpoint models.
3. **GET** `/models/loras` to list LoRA models.
4. Use model names in workflow node inputs.

### 4.5 Get Node Definitions for Dynamic UI

1. **GET** `/object_info` to retrieve all node schemas.
2. Parse `input.required` and `input.optional` for each node to build dynamic forms.
3. Use `output` types to validate connections between nodes.

### 4.6 Monitor Server Health

1. **GET** `/system_stats` to check server availability and resource usage.
2. Monitor `vram_free` and `ram_free` for resource availability.
3. Use `comfyui_version` for compatibility checks.

### 4.7 Clear History and Free Memory

1. **POST** `/history` with `{ "clear": true }` to wipe all history.
2. **POST** `/free` with `{ "unload_models": true, "free_memory": true }` to reclaim resources.

---

## 5. Usage in comfy-portal

This section maps ComfyUI API endpoints to their usage within the comfy-portal codebase.

### 5.1 Endpoints Currently Used

| Endpoint | Method | Used In | Purpose |
|---|---|---|---|
| `/ws` | WebSocket | `services/comfy-client.ts` | Real-time generation progress tracking |
| `/prompt` | POST | `services/comfy-client.ts` → `queuePrompt()` | Queue workflow for execution |
| `/interrupt` | POST | `services/comfy-client.ts` → `interrupt()` | Cancel running generation |
| `/history/{prompt_id}` | GET | `services/comfy-client.ts` → `getHistory()` | Retrieve generation results |
| `/view` | GET | `services/comfy-client.ts` → `downloadMedia()`, `services/comfy-api.ts`, `LoadImage.tsx` | Download/preview generated images |
| `/upload/image` | POST | `services/comfy-api.ts` → `uploadImage()` | Upload images for img2img workflows |
| `/system_stats` | GET | `features/server/utils/server-sync.ts` → `checkServerStatus()` | Server health check, latency measurement, OS detection |
| `/extensions` | GET | `features/server/utils/server-sync.ts` → `scanServerModels()` | Check for comfy-portal-endpoint extension |

### 5.2 Custom Extension Endpoints Used

These endpoints are **not** part of core ComfyUI but are provided by the `comfy-portal-endpoint` custom extension:

| Endpoint | Method | Used In | Purpose |
|---|---|---|---|
| `/experiment/models` | GET | `server-sync.ts` | List model folder types (custom format) |
| `/experiment/models/{folder}` | GET | `server-sync.ts` | List models with path index info |
| `/experiment/models/preview/{folder}/{pathIndex}/{name}` | GET | `server-sync.ts` | Get model preview images |
| `/api/cpe/workflow/list` | GET | `services/comfy-api.ts` → `listWorkflows()` | List server-side workflows |
| `/cpe/workflow/get-and-convert` | GET | `services/comfy-api.ts` → `getAndConvertWorkflow()` | Fetch and convert workflow to API format |

### 5.3 WebSocket Message Types Handled

| Message Type | Handled In | Usage |
|---|---|---|
| `progress` | `comfy-client.ts` → `trackProgress()` | Update progress bar (value/max) |
| `execution_cached` | `comfy-client.ts` → `trackProgress()` | Mark cached nodes as complete |
| `executing` | `comfy-client.ts` → `trackProgress()` | Track node execution; detect completion (`node=null`) |
| `execution_error` | `comfy-client.ts` → `trackProgress()` | Handle and report errors |
| `executed` | `comfy-client.ts` → `trackProgress()` | Acknowledged but no specific action taken |
| `execution_success` | `comfy-client.ts` → `trackProgress()` | Acknowledged but no specific action taken |
| `status` | `comfy-client.ts` → `trackProgress()` | Update queue remaining count |

### 5.4 Endpoints NOT Yet Used

The following ComfyUI API endpoints are available but not currently used in comfy-portal:

| Endpoint | Method | Potential Use |
|---|---|---|
| `/prompt` | GET | Quick queue status check |
| `/queue` | GET | Display detailed queue information |
| `/queue` | POST | Clear queue or remove specific items |
| `/history` | GET | Browse full generation history |
| `/history` | POST | Clear or delete history entries |
| `/free` | POST | Memory management / model unloading |
| `/models` | GET | List available model folder types |
| `/models/{folder}` | GET | List models (native endpoint; currently using custom extension instead) |
| `/embeddings` | GET | List available embeddings for autocomplete |
| `/object_info` | GET | Get all node definitions for dynamic UI |
| `/object_info/{node_class}` | GET | Get specific node schema |
| `/view_metadata/{folder}` | GET | Read safetensors metadata (training info, etc.) |
| `/upload/mask` | POST | Upload masks for inpainting workflows |
| `/features` | GET | Server capability detection |
| `/api/jobs` | GET | Unified job listing with filtering/pagination |
| `/api/jobs/{job_id}` | GET | Get single job details |
| `/internal/logs` | GET | Server log viewing |
| `/internal/folder_paths` | GET | Discover server directory configuration |
| `/internal/files/{type}` | GET | Browse output/input/temp directories |

### 5.5 WebSocket Features NOT Yet Used

| Feature | Description |
|---|---|
| Feature flags negotiation | Client does not send `feature_flags` on connect; could enable `supports_preview_metadata` for richer previews |
| `progress_state` message | Newer comprehensive progress format with per-node state tracking |
| `execution_start` message | Could be used to detect when execution actually begins (vs. queued) |
| `execution_interrupted` message | Distinct from `execution_error`; could provide better UX for user-initiated cancellations |
| Binary `PREVIEW_IMAGE` | Real-time latent preview images during sampling |
| Binary `PREVIEW_IMAGE_WITH_METADATA` | Preview images with node/prompt metadata |
| Binary `TEXT` | Progress text messages from nodes |

---

## Appendix: Protocol Constants

### Binary Event Types

```python
class BinaryEventTypes:
    PREVIEW_IMAGE = 1
    UNENCODED_PREVIEW_IMAGE = 2  # Internal only — converted to type 1 before sending
    TEXT = 3
    PREVIEW_IMAGE_WITH_METADATA = 4
```

### Preview Image Format Types (within PREVIEW_IMAGE payload)

| Value | Format |
|---|---|
| `1` | JPEG |
| `2` | PNG |

### Default Server Feature Flags

```json
{
  "supports_preview_metadata": true,
  "max_upload_size": "<configured_mb * 1024 * 1024 bytes>",
  "extension": {
    "manager": {
      "supports_v4": true
    }
  }
}
```
