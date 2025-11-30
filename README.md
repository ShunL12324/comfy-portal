# Comfy Portal

<div align="center">
  <img src="assets/images/icon.png" width="120" alt="Comfy Portal Logo" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
  
  <h3>Your Native iOS Companion for ComfyUI</h3>

  <p>
    <a href="https://apps.apple.com/us/app/comfy-portal/id6741044736">
      <img src="https://img.shields.io/badge/App_Store-Download-0D96F6?style=flat-square&logo=app-store&logoColor=white" alt="Download on the App Store">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-Custom-F5C518?style=flat-square" alt="License">
    </a>
    <a href="https://github.com/ShunL12324/comfy-portal/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/ShunL12324/comfy-portal/eas-build.yml?style=flat-square" alt="Build Status">
    </a>
  </p>
</div>

---

**Comfy Portal** is a professional, native iOS client designed for [ComfyUI](https://github.com/comfyanonymous/ComfyUI). It bridges the gap between desktop power and mobile convenience, offering a seamless experience for AI artists and developers.

> **Note**: This is an unofficial client and is not affiliated with the ComfyUI project.

## Features

| Feature | Description |
| :--- | :--- |
| **Native Experience** | Built with React Native and Expo for a smooth, responsive iOS feel. |
| **Real-time Monitor** | Watch generation progress step-by-step and preview images instantly. |
| **Seamless Connect** | Connect to local (LAN) or remote (Cloud/RunPod) ComfyUI instances. |
| **Workflow Manager** | View, manage, and execute your complex workflows on the go. |
| **Privacy First** | Direct connection to your server. No data is stored on our cloud. |

## Interface

| Workflow View | Generation Progress | Image Gallery |
| :---: | :---: | :---: |
| <img src="repo-assets/screenshot-1.png" width="240" style="border-radius: 12px;"> | <img src="repo-assets/screenshot-2.png" width="240" style="border-radius: 12px;"> | <img src="repo-assets/screenshot-3.png" width="240" style="border-radius: 12px;"> |

## Latest Updates

| Version | Date | Changes |
| :--- | :--- | :--- |
| **v1.0.4** | 2025-12-01 | • **Documentation**: Migrated to VitePress<br>• **Feature**: Smooth upload progress & cancellation<br>• **Fix**: Video preview issues resolved<br>• **Docs**: Added extension recommendation |

## Quick Start

### 1. Download App
Get the latest version directly from the App Store.

<a href="https://apps.apple.com/us/app/comfy-portal/id6741044736">
  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="50">
</a>

### 2. Setup Server
You need a running ComfyUI instance. We provide detailed guides for various setups:

| Environment | Guide |
| :--- | :--- |
| **Local** | [Local Server Setup](https://shunl12324.github.io/comfy-portal/guide/local-server) |
| **Remote** | [Remote Server Setup](https://shunl12324.github.io/comfy-portal/guide/remote-server) |
| **RunPod** | [RunPod Deployment](https://shunl12324.github.io/comfy-portal/guide/remote-server-runpod) |

### 3. Install Extension (Recommended)

To unlock full functionality, including **workflow synchronization** and enhanced app integration, we strongly recommend installing the [Comfy Portal Endpoint](https://github.com/ShunL12324/comfy-portal-endpoint) extension.

- **Workflow Sync**: Seamlessly sync your workflows from PC to App.
- **Enhanced Integration**: Provides necessary API endpoints for better app performance.

[Install Comfy Portal Endpoint →](https://github.com/ShunL12324/comfy-portal-endpoint)

## Development

### Prerequisites
- macOS with Xcode 15.0+
- Node.js 18+
- CocoaPods

### Build Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShunL12324/comfy-portal.git
   cd comfy-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run on iOS Simulator/Device**
   ```bash
   npx expo run:ios
   ```

## License
This project is available for **personal and educational use**. Commercial usage requires a separate license. See [LICENSE](LICENSE) for details.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

---
<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/ShunL12324">Shun</a></sub>
</div>
