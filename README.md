# SpamOrigin

SpamOrigin is a desktop application for analyzing email origins in your Outlook Junk folder. Built with Tauri and React, it inspects message headers to identify the actual domains of senders.

## Features

- **Origin Analysis**: Detects domains via DKIM and SPF headers.
- **Root Domain Grouping**: Consolidates subdomains into their parent domains.
- **Custom UI**: Dark-themed window with local window controls.
- **In-App Login**: Microsoft OAuth2 authentication within the app.
- **Expansion**: Click "+N more" to see all emails from a specific sender.
- **Local Privacy**: Processes all data locally; tokens and emails remain on your device.

## Prerequisites

- **Rust**: [rustup.rs](https://rustup.rs/)
- **Node.js**: [nodejs.org](https://nodejs.org/)
- **Linux Dependencies**:
  ```bash
  sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run dev mode**:
   ```bash
   npm run tauri dev
   ```

3. **Build**:
   ```bash
   npm run tauri build
   ```

## How It Works

The app uses the Microsoft Graph API to access the "Junk Email" folder and prioritizes authentication headers:
1. **DKIM (`header.d`)**
2. **SPF (`smtp.mailfrom`)**
3. **HELO (`smtp.helo`)**
4. **Sender Address** (Fallback)

## Security

- **OAuth2 PKCE**: Uses standard secure authentication flow.
- **Public Client ID**: Uses the Microsoft Graph PowerShell SDK ID.
- **Local Storage**: Data is processed in-memory or in local context only.

## License

MIT
