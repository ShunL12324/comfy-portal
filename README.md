# Comfy Portal - Blazor WebAssembly

> A Progressive Web App (PWA) for connecting to ComfyUI servers and generating AI images from anywhere.

[![Platform - Web](https://img.shields.io/badge/platform-Web%20(PWA)-blue.svg)](#)
[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4.svg)](https://dot.net)
[![Blazor WASM](https://img.shields.io/badge/Blazor-WebAssembly-512BD4.svg)](https://blazor.net)
[![License: Custom](https://img.shields.io/badge/license-Custom-yellow.svg)](LICENSE)

Comfy Portal is a Progressive Web App built with Blazor WebAssembly for ComfyUI. It enables users to interact with ComfyUI servers directly from any modern browser, making AI image generation accessible from any device.

> **Note**: This is a third-party client for ComfyUI and is not officially affiliated with the ComfyUI project.
> **Source**: Converted from React Native iOS app to Blazor WASM PWA - https://github.com/ShunL12324/comfy-portal

## Architecture

**Technology Stack:**
- **Blazor WebAssembly** - C# compiled to WebAssembly, runs entirely in browser
- **Progressive Web App (PWA)** - Installable, works offline, no app stores needed
- **MudBlazor** - Material Design UI component library
- **IndexedDB** - Browser database for local data storage
- **WebSocket API** - Direct connection to ComfyUI servers

## Features

### ✅ Implemented (Phase 1)
- 💻 **Progressive Web App** - Install on any device (iOS, Android, Windows, Mac, Linux)
- 📴 **Offline Support** - Works without internet once cached
- 🌓 **Dark/Light Theme** - User preference with persistence
- 📱 **Responsive Layout** - Works on desktop, tablet, and mobile
- 🎨 **Material Design UI** - Modern, polished interface with MudBlazor
- 💾 **Local Storage** - IndexedDB for servers, workflows, and images

### 🔄 In Development (Phases 2-13)
- 🔌 **Server Management** - Connect to local and remote ComfyUI instances
- 🎨 **Workflow Management** - Import from file, URL, clipboard, or presets
- 🔄 **Real-time Monitoring** - WebSocket connection with progress tracking
- 🖼️ **Image Generation** - 28 ComfyUI node types supported
- 📊 **History** - View and manage generated images
- 🛡️ **Privacy-first** - All data stored locally in browser

## Getting Started

### Prerequisites
- .NET 8.0 SDK or later
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Run Locally

```bash
# Clone the repository
git clone <repository-url>
cd comfy-portal-blazor

# Restore dependencies
dotnet restore

# Run development server
dotnet run

# Open browser to https://localhost:5001
```

### Install as PWA

1. Open the app in a modern browser
2. Look for the "Install" icon in the address bar
3. Click to install as a standalone app
4. App will appear on your home screen/desktop

## Project Structure

```
ComfyPortal/
├── Components/
│   ├── Layout/              # Main layout, navigation
│   ├── Pages/               # App pages (Home, Settings, etc.)
│   ├── ComfyUI/             # ComfyUI-specific components (28 nodes)
│   ├── Selectors/           # Model/sampler/scheduler selectors
│   ├── Shared/              # Shared UI components
│   └── UI/                  # Base UI components
├── Models/                  # Data models
├── Services/                # Business logic services
├── wwwroot/                 # Static files (CSS, JS, icons)
│   ├── manifest.json        # PWA manifest
│   └── service-worker.js    # Offline support
├── Program.cs               # App entry point
└── ComfyPortal.csproj       # Project file
```

## Implementation Status

### Phase 1: Project Setup ✅ (Complete)
- [x] Blazor WebAssembly project created
- [x] PWA configuration (manifest, service worker, icons)
- [x] MudBlazor UI framework integrated
- [x] IndexedDB storage configured
- [x] Main layout and navigation
- [x] Dark/light theme system
- [x] Home, Settings, Servers, Workflows pages

### Phase 2-13: See BLAZOR_CONVERSION_PLAN.md
Complete 13-phase implementation roadmap for full feature parity with original React Native app.

## Development Roadmap

| Phase | Duration | Status | Deliverable |
|-------|----------|--------|-------------|
| 1. Project Setup | 1 week | ✅ Complete | PWA shell app |
| 2. Core Models & Services | 1 week | 🔄 Next | Business logic |
| 3. WebSocket Client | 1 week | ⏳ Pending | ComfyUI client |
| 4. UI Component Library | 1 week | ⏳ Pending | Component library |
| 5. Server Management | 1 week | ⏳ Pending | Server CRUD |
| 6. Workflow Management | 1 week | ⏳ Pending | Workflow import |
| 7-8. Node Components | 2 weeks | ⏳ Pending | All 28 nodes |
| 9. Selector Components | 1 week | ⏳ Pending | All 15 selectors |
| 10. Workflow Execution | 1 week | ⏳ Pending | Generation flow |
| 11. Image Storage | 1 week | ⏳ Pending | Image management |
| 12. Settings & Guides | 1 week | ⏳ Pending | Auxiliary pages |
| 13. Polish & Testing | 1 week | ⏳ Pending | Production ready |

**Total Timeline:** 13-14 weeks (3-3.5 months)

## Why Blazor WebAssembly + PWA?

### Advantages over React Native
- ✅ **Truly cross-platform** - Works on iOS, Android, Windows, Mac, Linux (any device with a browser)
- ✅ **No app stores** - Deploy anywhere, update instantly
- ✅ **No native builds** - No Xcode, Android Studio, or platform-specific code
- ✅ **Direct ComfyUI connection** - No backend proxy needed
- ✅ **Installable** - PWA can be installed like a native app
- ✅ **Offline capable** - Service workers enable offline functionality
- ✅ **Easy deployment** - Just static files (GitHub Pages, Netlify, Vercel, etc.)

### C# Benefits
- **Type safety** - Compile-time type checking
- **Performance** - WebAssembly runs near-native speed
- **Tooling** - Visual Studio, Rider, VS Code support
- **Testing** - Mature testing ecosystem (xUnit, NUnit, etc.)
- **Ecosystem** - NuGet packages, LINQ, async/await

## Documentation

- **Conversion Plan:** [BLAZOR_CONVERSION_PLAN.md](BLAZOR_CONVERSION_PLAN.md) - Complete implementation roadmap
- **Original App:** https://github.com/ShunL12324/comfy-portal - React Native reference
- **Blazor Docs:** https://learn.microsoft.com/en-us/aspnet/core/blazor/
- **MudBlazor:** https://mudblazor.com/

## Contributing

This is a conversion project in active development. Contributions are welcome!

1. Check the [BLAZOR_CONVERSION_PLAN.md](BLAZOR_CONVERSION_PLAN.md) for current status
2. Pick a task from the next phase
3. Submit a PR with your changes

## License

[Original license from source project applies]

---

## Progress Tracker

**Last Updated:** 2025-11-14

**Current Phase:** Phase 1 Complete ✅
**Next Phase:** Phase 2 - Core Models & Services

**Overall Progress:** 7.7% (1/13 phases)

**Files Created:** 16 files (~1,000+ lines of code)
- 1 Project file (`.csproj`)
- 1 Program entry point (`Program.cs`)
- 1 Root component (`App.razor`)
- 1 Imports file (`_Imports.razor`)
- 3 Layout components
- 4 Page components
- 1 HTML page
- 1 PWA manifest
- 1 Service worker
- 1 CSS file
- 1 JavaScript file

**Feature Parity:** 0/8 core features (0%) - Infrastructure complete, features pending

---

Built with ❤️ using Blazor WebAssembly
