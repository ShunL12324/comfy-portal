---
layout: guide
title: Remote Server Setup Guide
warning_title: Disclaimer
warning_content: This guide provides setup instructions only. Please understand all potential risks before proceeding. We are not responsible for any damages or losses that may occur.
---

Follow these steps to connect to your remote ComfyUI server. The setup
is similar to local server, but requires additional security measures.

Please follow the official ComfyUI installation guide to set up the
required environment and dependencies on your remote server:

[ComfyUI Installation Guide →](https://github.com/comfyanonymous/ComfyUI#installing)

## 1. Network Requirements

Ensure your remote server meets these requirements:

- A public IP address or domain name
- Port 8188 (or your chosen port) is open and accessible
- Firewall configured to allow incoming connections

## 2. HTTPS Setup (Required)

Due to Apple's security restrictions, HTTPS is required for remote
connections. You have two options:

- Follow ComfyUI's built-in SSL/TLS setup guide:
  [ComfyUI TLS/SSL Setup Guide →](https://github.com/comfyanonymous/ComfyUI?tab=readme-ov-file#how-to-use-tlsssl)

Alternatively, you can use Nginx or similar web servers as a reverse
proxy to handle HTTPS

## 3. Connect to the Server

Once the server is running with HTTPS, tap the "+" button to add it
with these details:

- Name: Give your server a memorable name (e.g., "Cloud Server")
- Host: Your server's public IP or domain name (do not include
  https:// prefix)
- Port: 8188 (or your configured port)

**Example:**

> Name: Cloud ComfyUI  
> Host: comfyui.example.com  
> Port: 8188

For troubleshooting and additional setup options, visit:

[ComfyUI GitHub Repository →](https://github.com/comfyanonymous/ComfyUI)
