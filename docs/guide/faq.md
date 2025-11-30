---
title: FAQ
---

## Connection Settings

### Do I need to include http/s prefix when entering the host?

No. This is because Comfy Portal communicates with the server using both HTTP protocol and WebSocket. The system will handle the protocol prefixes automatically - you only need to enter the domain name or IP address.

### I cannot connect to my server, how should I troubleshoot?

1. First, please confirm that you can access the server via a browser on your device.
2. If you can access it via browser but not through the app, try adjusting the "Use SSL" option and refresh.

### I cannot sync my workflow to the app via comfy-portal-endpoint extension?

1. Please ensure you have an active browser window connected to the server. This is because workflow conversion relies on frontend code, and we currently don't have a better solution.
2. Please ensure the workflow can run normally on that server, otherwise some nodes might not be recognized correctly, causing sync failure.

 