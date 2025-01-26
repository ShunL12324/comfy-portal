# Comfy Portal

<img src="assets/images/icon.png" width="120" alt="Comfy Portal Logo" />

Comfy Portal is an open-source iOS application that brings the power of ComfyUI to your mobile device. It enables users to interact with ComfyUI directly from their iOS devices, making AI image generation more accessible and portable.

## Features

- Native iOS interface for ComfyUI
- Modern and intuitive user experience
- Seamless connection to ComfyUI instances
- Real-time workflow monitoring
- Optimized for mobile interaction

## Pro Version

A pro version of Comfy Portal is available on the App Store with additional features:

- Advanced workflow management
- Premium presets and templates
- Priority support
- Extended customization options
- Cloud sync capabilities
- Advanced AI features

[Get Pro Version on App Store](#) _(Coming Soon)_

## Getting Started

Note: These instructions are for personal development and testing purposes only.

### Prerequisites

- Node.js (LTS version)
- iOS Development environment
- Xcode (latest version)
- ComfyUI instance (local or remote)
- [Expo Go](https://expo.dev/go) app installed on your iOS device

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ShunL12324/comfy-portal.git
   cd comfy-portal
   ```

2. Install dependencies:

   ```bash
   npx expo install
   ```

3. Start the development server:

   ```bash
   npx expo start
   ```

4. Run on iOS:
   - Press 'i' to open in iOS simulator (requires Xcode)
   - Or scan the QR code with your iPhone camera to open in Expo Go
   - For development builds: `npx expo run:ios`

### Development Builds

To create a development build:

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   ```

2. Configure Apple Developer Account:

   - Enroll in the [Apple Developer Program](https://developer.apple.com/programs/)
   - Set up your Apple Developer Team ID in `eas.json`
   - Configure your Bundle Identifier
   - Create and download required certificates and provisioning profiles
   - For detailed instructions, see [Expo's iOS credentials guide](https://docs.expo.dev/app-signing/ios-credentials/)

3. Build for development:

   ```bash
   npx eas build --profile development --platform ios
   ```

4. Install the development build:
   ```bash
   npx eas build:run
   ```

Note: For running on physical devices, you'll need:

- Valid Apple Developer Account (Apple Developer Program membership required)
- Development Certificate
- Provisioning Profile matching your bundle identifier
- Device registered in your Apple Developer account

These requirements are for personal development use only. This is not intended for App Store distribution.

For more information about development builds, visit [Expo Development Builds Documentation](https://docs.expo.dev/develop/development-builds/introduction/).

## Development

This project is built with:

- [Expo](https://expo.dev)
- [React Native](https://reactnative.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Gluestack UI](https://gluestack.io)
- [NativeWind](https://www.nativewind.dev)
- [Moti](https://moti.fyi)

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project uses a Source Available license. The source code is publicly available for personal and educational use, while commercial usage requires proper licensing.

### License Terms

- **Personal & Educational Use**: Free to use for:

  - Personal projects
  - Learning and studying
  - Academic research
  - Testing and evaluation

- **Commercial Use**:
  - Requires proper licensing
  - Contact us for commercial opportunities

For detailed terms and conditions, please see the [LICENSE](LICENSE) file.

For commercial inquiries:
Email: liushun0574@gmail.com
GitHub: https://github.com/ShunL12324/comfy-portal

## Support

- [Open an issue](https://github.com/ShunL12324/comfy-portal/issues)
- [Join our community](#)

## Acknowledgments

- ComfyUI team for the amazing project
- All contributors who help make Comfy Portal better
