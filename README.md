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

### Prerequisites - Inverse Order of Priority

- Node.js 18+
- Docker (for BirdNET)
- ngrok (for BirdNET API tunnel)
- Android phone with USB debugging OR Expo Go app
- Internet
- Computer
- Pulse

---

## Infrastructure

- **Supabase:** phayiovbyaaqimlshmxo.supabase.co
- **BirdNET Docker:** localhost:8080
- **ngrok Tunnel:** https://pruinose-alise-uncooled.ngrok-free.dev
- **Edge Function:** analyze-birdcall (deployed)

---

## Known Issues

1. Manual Synch button in-app doesn't work (currently fully automated for testing) so no "offline/field mode" for upload later.
2. Lat/Long not displaying for filtering in database, although it is being captured. Displaying on-App.
3. Confidence level not displaying in Supabase for display or filtering. It is being captured and is being displayed in-app.
4. I really don't like what you've done with your hair. It's fine. I'm just saying that I liked it better before.

---

## Documentation

- **Repo hygiene aka "Dumping It All In /docs" completed. Most is out of date or wrong, will be culled brutally and in front of other docs in order to sow fear and obedience.

---

## Repository

https://github.com/Awesomnian/biosys_swift

---


