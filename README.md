# Comfy Portal

<div align="center">
  <img src="assets/images/icon.png" width="128" alt="Comfy Portal Logo" style="border-radius: 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
  
  <h3>Your Native iOS Companion for ComfyUI</h3>

  <p>
    <a href="https://apps.apple.com/us/app/comfy-portal/id6741044736">
      <img src="https://img.shields.io/badge/App_Store-0D96F6?style=for-the-badge&logo=app-store&logoColor=white" alt="Download on the App Store">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-Custom-F5C518?style=for-the-badge" alt="License">
    </a>
    <a href="https://github.com/ShunL12324/comfy-portal/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/ShunL12324/comfy-portal/eas-build.yml?style=for-the-badge" alt="Build Status">
    </a>
  </p>
</div>

---

**Comfy Portal** is a modern, native iOS client for [ComfyUI](https://github.com/comfyanonymous/ComfyUI). It brings the power of node-based AI image generation to your pocket, allowing you to monitor workflows, manage models, and generate images from anywhere.

> **Note**: This is an unofficial client and is not affiliated with the ComfyUI project.

## ✨ Features

- **📱 Native Experience**: Smooth, responsive iOS interface built with React Native and Expo.
- **🔄 Real-time Monitoring**: Watch your generation progress and preview images instantly.
- **🔌 Seamless Connection**: Connect to local or remote ComfyUI instances easily.
- **🎨 Workflow Management**: View and run your workflows on the go.
- **🛡️ Privacy First**: Your data stays on your device. Direct connection to your server.

## 📸 Screenshots

<div align="center">
  <img src="repo-assets/screenshot-1.png" width="240" alt="Workflow View" style="border-radius: 16px; margin: 8px;">
  <img src="repo-assets/screenshot-2.png" width="240" alt="Generation Progress" style="border-radius: 16px; margin: 8px;">
  <img src="repo-assets/screenshot-3.png" width="240" alt="Image Gallery" style="border-radius: 16px; margin: 8px;">
</div>

## 🚀 Quick Start

### Download from App Store
The easiest way to get started is to download the app directly from the App Store.

<a href="https://apps.apple.com/us/app/comfy-portal/id6741044736">
  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="50">
</a>

### Server Setup
To use Comfy Portal, you need a running ComfyUI instance. Check out our detailed guides:

- [🏠 Local Server Setup](https://shunl12324.github.io/comfy-portal/guide/local-server) - Run ComfyUI on your computer
- [☁️ Remote Server Setup](https://shunl12324.github.io/comfy-portal/guide/remote-server) - Host ComfyUI on a remote server
- [🚀 RunPod Deployment](https://shunl12324.github.io/comfy-portal/guide/remote-server-runpod) - Deploy ComfyUI on RunPod

## 🛠️ Development

### Prerequisites
- macOS with Xcode 15.0+
- Node.js 18+
- CocoaPods

### Build from Source
```bash
# Clone the repository
git clone https://github.com/ShunL12324/comfy-portal.git
cd comfy-portal

# Install dependencies
npm install

# Run on iOS Simulator/Device
npx expo run:ios
```

## 📄 License
This project is available for **personal and educational use**. Commercial usage requires a separate license. See [LICENSE](LICENSE) for details.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

---
<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/ShunL12324">Shun</a></sub>
</div>
