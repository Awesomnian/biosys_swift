# BioSys Swift - Swift Parrot Bioacoustic Monitoring

A React Native mobile app for detecting Swift Parrot calls using BirdNET ML analysis.

---

## Project Status

- Audio recording, BirdNET ML analysis, and species detection are functional.
- Detections (confidence > 80% for Swift Parrot or Orange-bellied Parrot) are uploaded to Supabase and displayed in-app.
- GPS tagging and timestamping are operational, though filtering and confidence display in Supabase are still in progress.
- Mapping is planned next.

---

## Features

- Continuous audio recording (5-second segments)
- GPS coordinates for each recording
- BirdNET ML analysis for Swift Parrot detection
- Storage of detections with audio, GPS, and timestamp
- Automated upload to Supabase

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for BirdNET)
- ngrok (for BirdNET API tunnel)
- Android phone with USB debugging OR Expo Go app
- Internet
- Computer

### Setup

1. Clone this repo:
    ```bash
    git clone https://github.com/Awesomnian/biosys_swift.git
    cd biosys_swift
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the app (Expo Go recommended for quick testing):
    ```bash
    npm start
    ```
4. Ensure BirdNET server is running (see `scripts/` and Docker instructions).
5. Connect your Android device or use Expo Go for preview.

---

## Architecture

```
Mobile App → Supabase Storage → Edge Function → BirdNET Docker → Results
```

---

## Known Issues

- Manual sync button does not work yet (upload is automated for testing)
- Lat/Long and confidence levels are captured but not fully displayed or filterable in Supabase
- Offline/field mode upload is not implemented

---

## Contributing

Pull requests and suggestions are welcome! Please open issues for bugs or features.

---

## License

MIT

---

## Repository

https://github.com/Awesomnian/biosys_swift

---

## Configuration (app.json / EAS secrets)

The app expects a few runtime configuration values to be provided via `app.json` `extra` or via EAS secrets for production builds:

- `supabaseUrl` — your Supabase project URL (e.g. `https://xyz.supabase.co`).
- `supabaseAnonKey` — the public anon key (or use EAS secrets to inject this at build/runtime).
- `birdnetUrl` — the BirdNET server base URL (eg an ngrok forwarding URL or a hosted BirdNET instance).

For local development, copy `app.example.json` to `app.json` and fill in the values. For CI and production, prefer EAS secrets so you do not commit keys.

Example (local):

```json
{
    "expo": {
        "extra": {
            "supabaseUrl": "https://your-project.supabase.co",
            "supabaseAnonKey": "public-anon-key-or-eas-secret",
            "birdnetUrl": "https://your-ngrok-or-birdnet-host"
        }
    }
}
```

If `extra` values are not provided, the app will warn on startup and some features will be disabled until configured.