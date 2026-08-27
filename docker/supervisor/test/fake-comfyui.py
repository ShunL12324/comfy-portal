#!/usr/bin/env python3
"""Stands in for ComfyUI in the supervisor test rig: answers /system_stats and nothing else."""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.startswith("/system_stats"):
            body = json.dumps({"system": {"comfyui_version": "fake"}}).encode()
            self.send_response(200)
        else:
            body = b"{}"
            self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


port = int(os.environ.get("COMFY_PORT", "8188"))
# Honour --port so the supervisor's real argv works unchanged.
argv = os.sys.argv
if "--port" in argv:
    port = int(argv[argv.index("--port") + 1])
HTTPServer(("0.0.0.0", port), Handler).serve_forever()
