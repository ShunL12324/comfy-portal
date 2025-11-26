<div align="center">
  <img src="assets/images/icon.png" width="100" alt="Comfy Portal Logo" style="border-radius: 22px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
  
  <h3>Comfy Portal</h3>
  <p><strong>Native iOS Client for ComfyUI</strong></p>

  <p>
    <a href="https://apps.apple.com/us/app/comfy-portal/id6741044736">
      <img src="https://img.shields.io/badge/App_Store-Download-000000?style=flat-square&logo=app-store&logoColor=white" alt="Download on the App Store">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-Custom-eaeaea?style=flat-square&labelColor=ffffff&color=eaeaea" alt="License">
    </a>
    <a href="https://github.com/ShunL12324/comfy-portal/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/ShunL12324/comfy-portal/eas-build.yml?style=flat-square&labelColor=ffffff&color=eaeaea" alt="Build Status">
    </a>
  </p>
</div>

<br>

<p align="center">
  Comfy Portal bridges the gap between desktop power and mobile convenience. Designed for professionals and enthusiasts, it offers a seamless, native experience for monitoring and managing your AI generation workflows.
</p>

<br>

<h3>Features</h3>

<table>
  <tr>
    <td width="200"><strong>Native Experience</strong></td>
    <td>Built with React Native for a fluid, responsive iOS interface that feels right at home on your device.</td>
  </tr>
  <tr>
    <td><strong>Real-time Monitor</strong></td>
    <td>Track generation progress step-by-step with instant image previews.</td>
  </tr>
  <tr>
    <td><strong>Seamless Connect</strong></td>
    <td>Connect effortlessly to local (LAN) or remote (Cloud/RunPod) ComfyUI instances.</td>
  </tr>
  <tr>
    <td><strong>Workflow Manager</strong></td>
    <td>View, manage, and execute complex workflows directly from your phone.</td>
  </tr>
  <tr>
    <td><strong>Privacy First</strong></td>
    <td>Direct connection to your server. No data is stored on our cloud.</td>
  </tr>
</table>

<br>

<h3>Interface</h3>

<div align="center">
  <table>
    <tr>
      <td align="center" width="33%"><img src="repo-assets/screenshot-1.png" width="100%" alt="Workflow View" style="border-radius: 8px;"></td>
      <td align="center" width="33%"><img src="repo-assets/screenshot-2.png" width="100%" alt="Generation Progress" style="border-radius: 8px;"></td>
      <td align="center" width="33%"><img src="repo-assets/screenshot-3.png" width="100%" alt="Image Gallery" style="border-radius: 8px;"></td>
    </tr>
    <tr>
      <td align="center"><small>Workflow View</small></td>
      <td align="center"><small>Generation Progress</small></td>
      <td align="center"><small>Image Gallery</small></td>
    </tr>
  </table>
</div>

<br>

<h3>Get Started</h3>

<h4>1. Download App</h4>
<p>Get the latest version directly from the App Store.</p>
<a href="https://apps.apple.com/us/app/comfy-portal/id6741044736">
  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="40">
</a>

<h4>2. Setup Server</h4>
<p>You need a running ComfyUI instance. We provide detailed guides for various setups:</p>

<table>
  <thead>
    <tr>
      <th>Environment</th>
      <th>Documentation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Local Server</td>
      <td><a href="https://shunl12324.github.io/comfy-portal/guide/local-server">Setup Guide</a></td>
    </tr>
    <tr>
      <td>Remote Server</td>
      <td><a href="https://shunl12324.github.io/comfy-portal/guide/remote-server">Setup Guide</a></td>
    </tr>
    <tr>
      <td>RunPod</td>
      <td><a href="https://shunl12324.github.io/comfy-portal/guide/remote-server-runpod">Deployment Guide</a></td>
    </tr>
  </tbody>
</table>

<br>

<h3>Development</h3>

<details>
<summary>Build Instructions</summary>

<br>

<strong>Prerequisites</strong>
<ul>
  <li>macOS with Xcode 15.0+</li>
  <li>Node.js 18+</li>
  <li>CocoaPods</li>
</ul>

<strong>Build Steps</strong>
<pre>
# 1. Clone the repository
git clone https://github.com/ShunL12324/comfy-portal.git
cd comfy-portal

# 2. Install dependencies
npm install

# 3. Run on iOS Simulator/Device
npx expo run:ios
</pre>
</details>

<br>

<h3>License</h3>
<p>This project is available for <strong>personal and educational use</strong>. Commercial usage requires a separate license. See <a href="LICENSE">LICENSE</a> for details.</p>

<br>

<div align="center">
  <small>Built by <a href="https://github.com/ShunL12324">Shun</a></small>
</div>
