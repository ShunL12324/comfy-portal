---
title: Local Server Setup Guide
---

Follow these steps to set up your own ComfyUI server locally and connect
it to this app.

Please follow the official ComfyUI installation guide to set up the
required environment and dependencies:

[ComfyUI Installation Guide →](https://github.com/comfyanonymous/ComfyUI#installing)

## 1. Network Setup

Ensure your phone and the computer running ComfyUI are on the same local network (connected to the same WiFi/router).

To find your computer's IP address:

- Windows: Open Command Prompt and type "ipconfig"
- macOS: Open Terminal and type "ifconfig" or go to System Settings → Network
- Linux: Open Terminal and type "ip addr" or "ifconfig"

> Look for IPv4 address, usually starting with 192.168.x.x or 10.0.x.x

## 2. Start the Server

After installation, start the ComfyUI server with network access enabled:

```bash
python main.py --listen 0.0.0.0 --port 8188
```

This will start the server on port 8188 and make it accessible from
other devices on your network.

## 3. Connect to the Server

Once the server is running, tap the "+" button to add a new server
with the following details:

- Name: Give your server a memorable name (e.g., "Home Server")
- Host: Your computer's IP address or "localhost" (do not include http:// prefix)
- Port: 8188 (default ComfyUI port)

**Example Configuration:**

| Field | Value |
| :--- | :--- |
| **Name** | Home ComfyUI |
| **Host** | `192.168.1.100` |
| **Port** | `8188` |

For troubleshooting and additional setup options, visit:

[ComfyUI GitHub Repository →](https://github.com/comfyanonymous/ComfyUI)
