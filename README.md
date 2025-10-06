# BioSys Swift - Swift Parrot Bioacoustic Monitoring

A React Native mobile app for detecting Swift Parrot calls using BirdNET ML analysis.

---

## Current Status (2025-10-07)
App functioning, synchronisation with BirdNET for identification, upload of positive identification of Swift Parrot or Orange-bellied parrots (confidence > 80%) now uploading to Supabase and displaying in-app to user. Lat/Long, Date/Time, UniqueID and associated Positive Audio recordings saved locally and to Supabase for.

Mapping next. After bed.

## What It Should Do

1. Record audio continuously (5-second segments)
2. Get GPS coordinates for each recording
3. Analyze audio with BirdNET to detect Swift Parrots
4. Store detections with audio + GPS + timestamp

---

## Architecture

```
Mobile App → Supabase Storage → Edge Function → BirdNET Docker → Results
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for BirdNET)
- ngrok (for BirdNET API tunnel)
- Android phone with USB debugging OR Expo Go app

### Setup
```bash
cd C:\AI\biosys_swift\git
npm install
npx expo start
```

---

## Infrastructure

- **Supabase:** phayiovbyaaqimlshmxo.supabase.co
- **BirdNET Docker:** localhost:8080
- **ngrok Tunnel:** https://pruinose-alise-uncooled.ngrok-free.dev
- **Edge Function:** analyze-birdcall (deployed)

---

## Known Issues

1. GPS permission request hangs in development build
2. Microphone permission request hangs in development build
3. Button visual feedback not working
4. BirdNET audio format compatibility (M4A vs WAV)

---

## Documentation

- **Current Status:** [`PROJECT_STATUS_2025-10-05.md`](PROJECT_STATUS_2025-10-05.md)
- **Implementation Plan:** [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- **Archived Docs:** `docs/archive/2025-10-05/` (historical attempts)

---

## Repository

https://github.com/Awesomnian/biosys_swift

---

**For detailed status and next steps, see PROJECT_STATUS_2025-10-05.md**
