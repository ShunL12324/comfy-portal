# Comfy Portal

<img src="assets/images/icon.png" width="120" alt="Comfy Portal Logo" />

Comfy Portal is a native iOS client application that brings the power of ComfyUI to your mobile device. It enables users to interact with ComfyUI servers directly from their iOS devices, making AI image generation more accessible and portable.

> **Note**: This is a third-party client for ComfyUI and is not officially affiliated with the ComfyUI project.

## Features

- 📱 Native iOS interface optimized for mobile
- 🔄 Real-time workflow monitoring and control
- 🎨 Intuitive preset management
- 🔌 Seamless connection to ComfyUI instances
- 🛡️ Local-first approach with data privacy
- 📊 Resource usage monitoring
- 🌙 Dark mode support

## Key Features

### Flexible Server Management

- Connect to multiple ComfyUI servers seamlessly
- Support both local network (home computer) and cloud-based servers
- Easy server addition and switching
- Monitor server status in real-time

### Remote Generation Control

- Control image generation through your ComfyUI server
- Adjust generation parameters on the go
- Select and switch between different base models
- Built-in LoRa model support and management

### Remote Access & Control

- Control your ComfyUI instance from anywhere
- Real-time generation monitoring
- View results instantly on your device
- Save and share generated images directly

## Screenshots

[Coming Soon]

## Version

Current Version: 1.0.0

## Requirements

- iOS 15.1 or later
- iPhone only (iPad support coming soon)
- Access to a ComfyUI server (local or remote)

## Installation

### App Store

[![Download on the App Store](https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg)](https://apps.apple.com/us/app/comfy-portal/id6741044736)

### Development Build

> Note: These instructions are for personal learning and use only.

1. Prerequisites:

   - Node.js (LTS version)
   - Xcode 14.0 or later
   - iOS Development environment
   - Valid Apple Developer Account
   - iOS Development Certificate and Provisioning Profile properly set up in Xcode

2. Clone and Install:

   ```bash
   git clone https://github.com/ShunL12324/comfy-portal.git
   cd comfy-portal
   npx expo install
   ```

3. Start Development:

   ```bash
   npx expo run:ios -d
   ```

This will build and run a full development version on your device.

## Technology Stack

- **Framework**: [Expo](https://expo.dev) with React Native
- **UI Components**: [Gluestack UI v2](https://gluestack.io)
- **Styling**: [NativeWind](https://www.nativewind.dev)
- **Animations**: [Moti](https://moti.fyi)
- **Icons**: [Lucide React Native](https://lucide.dev)
- **Language**: TypeScript
- **Build System**: EAS Build

## Security & Privacy

- All data is stored locally on your device
- No data is collected or transmitted except for server connections
- Server connections are made directly to your specified ComfyUI instances
- No analytics or tracking implemented
- Photo library access is only used for saving generated images

## License

This project uses a Source Available license. The source code is publicly available for personal and educational use, while commercial usage requires proper licensing.

### License Terms

- **Personal & Educational Use**: Free for:

  - Personal projects
  - Learning and studying
  - Academic research
  - Testing and evaluation

- **Commercial Use**:
  - Requires proper licensing
  - Contact for commercial opportunities

For detailed terms and conditions, please see the [LICENSE](LICENSE) file.

## Legal

- [Privacy Policy](docs/privacy.html)
- [Terms of Service](docs/terms.html)

## Support & Contact

For support, bug reports, or commercial inquiries:

- Email: liushun0574@gmail.com
- GitHub Issues: [Open an issue](https://github.com/ShunL12324/comfy-portal/issues)

## Acknowledgments

Special thanks to the [ComfyUI](https://github.com/comfyanonymous/ComfyUI) team for creating the amazing project that made this client possible.
