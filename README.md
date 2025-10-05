# BioSys: Swift - Swift Parrot Bioacoustic Monitoring App

A proof-of-concept mobile application for autonomous detection and monitoring of Swift Parrot (*Lathamus discolor*) calls using machine learning.

## ⚠️ Project Status: BLOCKED - Unresolved Technical Issue

**Current State**: Development halted due to unresolvable React Native networking limitations.

**Issue**: The mobile app cannot make HTTP POST requests with FormData to external APIs (ngrok tunnel or Supabase Edge Functions). All network requests fail with `TypeError: Network request failed` despite the endpoints being publicly accessible.

**Attempts**: 25+ different approaches over 37 versions - all failed
**Root Cause**: Unknown - likely React Native/iOS networking restrictions in Expo Go environment

**See**: `REACT_NATIVE_NETWORKING_ISSUE.md` for complete technical analysis and attempted solutions.

### What Works ✅
- Real-time audio capture on mobile devices
- GPS geolocation tracking
- UI and navigation (Monitor, Detections, Settings tabs)
- Supabase database connections
- BirdNET Docker container + ngrok tunnel

### What Doesn't Work ❌
- HTTP requests from React Native to external APIs
- ML analysis integration (blocked by networking issue)
- Detection storage (depends on ML analysis)
- **Core POC functionality is non-operational**

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker Desktop
- ngrok (free account)
- Expo Go app on mobile device
- Mobile device and laptop on same WiFi network

### Setup (5 minutes)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start BirdNET Server**
   ```bash
   docker run -d -p 8080:80 benjaminloeffel/birdnet-inference-api
   ```

3. **Start ngrok Tunnel**
   ```bash
   ngrok http 8080
   ```
   Copy the HTTPS URL (e.g., `https://xxx.ngrok-free.dev`)

4. **Configure Environment**

   Update `.env` with your ngrok URL:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=[already set]
   EXPO_PUBLIC_BIRDNET_SERVER_URL=https://xxx.ngrok-free.dev
   ```

   **⚠️ CRITICAL**: The ngrok URL changes EVERY TIME ngrok restarts (free tier). Before starting development, ALWAYS:
   - Check your ngrok console for the current URL
   - Update `EXPO_PUBLIC_BIRDNET_SERVER_URL` in `.env`
   - Force quit and restart your mobile app

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Test on Mobile**
   - Open Expo Go
   - Scan QR code
   - Grant microphone and location permissions
   - Tap "Start Monitoring"

---

## How It Works

```
┌─────────────────┐
│  Mobile Device  │ Captures 5-second audio segments
└────────┬────────┘
         │
         ▼ POST /inference/
┌─────────────────┐
│  ngrok Tunnel   │ Forwards to localhost:8080
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Docker BirdNET  │ Analyzes with ML model
└────────┬────────┘
         │
         ▼ Returns predictions
┌─────────────────┐
│  Mobile Device  │ If Swift Parrot + confidence ≥ 90%:
│                 │ - Get GPS coordinates
│                 │ - Save audio to Supabase Storage
│                 │ - Save metadata to database
└─────────────────┘
```

### Detection Logic
1. Every 5 seconds: capture audio segment
2. Send to BirdNET for species identification
3. Check all predictions for "swift" or "lathamus" in species name
4. If Swift Parrot confidence ≥ threshold (default 90%):
   - Save audio file + metadata to Supabase
   - Display in Detections tab
5. Otherwise: discard audio (save bandwidth/storage)

---

## Architecture

### Mobile App (React Native/Expo)
- **Monitor Screen**: Start/stop monitoring, view statistics
- **Detections Screen**: Browse detected Swift Parrot calls
- **Settings Screen**: Configure threshold, location, sync

### Services Layer
- **SensorService**: Main orchestration (coordinates all components)
- **AudioCaptureService**: Continuous 5-second audio recording
- **BirdNETDetectionModel**: API interface to BirdNET
- **StorageService**: Supabase integration for data persistence
- **LocationService**: GPS tracking and coordinates

### Backend
- **BirdNET Docker**: ML model for bird species identification
- **ngrok**: Exposes localhost to mobile device
- **Supabase**: Database and file storage

---

## Project Structure

```
biosys-swift/
├── app/
│   ├── (tabs)/          # Tab navigation screens
│   │   ├── index.tsx    # Monitor screen
│   │   ├── detections.tsx  # Detection history
│   │   └── settings.tsx    # Configuration
│   └── _layout.tsx      # Root layout
│
├── services/
│   ├── sensorService.ts          # Main orchestration ✅
│   ├── audioCapture.ts           # Audio recording ✅
│   ├── detectionModelBirdNET.ts  # BirdNET API interface ✅
│   ├── storageService.ts         # Supabase integration ✅
│   ├── locationService.ts        # GPS tracking ✅
│   └── modelFactory.ts           # Model selection ✅
│
├── supabase/
│   ├── migrations/      # Database schema
│   └── functions/       # Edge functions (not currently used)
│
├── .env                 # Environment configuration
├── PROJECT_DOCUMENTATION.md  # Complete architecture guide
├── CURRENT_STATUS.md    # What works/doesn't work
└── TEST_CONNECTION.md   # Testing guide
```

---

## Configuration

### Environment Variables (`.env`)

```bash
# Supabase (database and storage)
EXPO_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[your key]

# BirdNET Server (REQUIRED - updates on each ngrok restart)
EXPO_PUBLIC_BIRDNET_SERVER_URL=https://your-ngrok-url.ngrok-free.dev
```

**IMPORTANT**: After updating `.env`, you MUST:
1. Force quit the mobile app
2. Reopen Expo Go
3. Scan QR code again

### Detection Settings

- **Threshold**: 0.9 (90% confidence) - adjustable in Settings tab
- **Segment Duration**: 5 seconds (fixed)
- **Max Consecutive Errors**: 5 (then auto-stop)
- **Error Cooldown**: 30 seconds between error messages

---

## Database Schema

### `detections` Table
```sql
id              uuid PRIMARY KEY
device_id       text              -- Unique sensor identifier
timestamp       timestamptz       -- When detection occurred
latitude        float8            -- GPS latitude
longitude       float8            -- GPS longitude
confidence      float8            -- ML confidence (0.0-1.0)
model_name      text              -- "BirdNET"
audio_file_url  text              -- Supabase Storage URL
```

### Storage Bucket
- **Name**: `detections`
- **Contents**: Audio files (.webm format)
- **Security**: RLS enabled, authenticated access only

---

## Testing

### Test BirdNET Connection
1. Ensure Docker and ngrok are running
2. Visit ngrok URL in mobile browser
3. Should see BirdNET API documentation

### Test Detection
1. Start monitoring in app
2. Play Swift Parrot call from YouTube/Xeno-canto
3. Watch for detection within 5-10 seconds
4. Check Detections tab for saved result

### Troubleshooting

**"BirdNET server unreachable"**
- Verify Docker is running: `docker ps`
- Verify ngrok is running: check PowerShell/terminal
- Verify mobile and laptop on same WiFi
- Try accessing ngrok URL in mobile browser

**"Monitoring stops automatically"**
- Normal after 5 consecutive failures
- Check error message for specific issue
- Restart monitoring after fixing problem

**"No detections appearing"**
- Default threshold is 90% (very high)
- Lower threshold in Settings tab
- Try playing known Swift Parrot recording
- Check Supabase database directly

---

## Known Limitations

### 🔴 Critical Issue: Networking Failure (Project Blocker)
- React Native cannot make HTTP POST requests to external APIs
- All approaches (fetch, XMLHttpRequest, proxies) fail identically
- Endpoints are accessible via browser/curl but not from app
- 25+ fix attempts across 37 versions - all unsuccessful
- **See REACT_NATIVE_NETWORKING_ISSUE.md for full details**

### Network Requirements
- ⚠️ Mobile device and laptop must be on same WiFi
- ⚠️ **ngrok URL changes on each restart (free tier)** - Always verify URL before development
- ⚠️ No offline detection (requires network for every analysis)
- ⚠️ Currently blocked by networking issue above

### Platform Restrictions
- ⚠️ Web version non-functional (mobile-only)
- ⚠️ Requires Expo Go or custom build
- ⚠️ Cannot test in actual remote field locations

### Potential Solutions (Not Implemented)
- Use Expo Development Build instead of Expo Go
- Try expo-file-system FileSystem.uploadAsync() for HTTP uploads
- Re-architect with Supabase Storage → Database Trigger → Edge Function
- Deploy BirdNET to permanent cloud server (not ngrok)
- Rebuild in native iOS/Android or different framework (Flutter, etc.)

### Future Enhancements (If Networking Resolved)
- Deploy BirdNET to cloud (Railway, Digital Ocean)
- Implement on-device ML with TensorFlow Lite
- Offline audio queueing and batch upload
- Audio playback of detections
- Species information and images
- Data export (CSV, GeoJSON)

---

## Documentation

- **REACT_NATIVE_NETWORKING_ISSUE.md**: ⚠️ **Critical blocker** - Complete analysis of networking failure
- **PROJECT_DOCUMENTATION.md**: Complete architecture, data flow, API contracts
- **CURRENT_STATUS.md**: Detailed status of all components
- **TEST_CONNECTION.md**: Step-by-step testing guide

---

## Technology Stack

- **Mobile Framework**: React Native + Expo
- **Navigation**: Expo Router (file-based)
- **ML Model**: BirdNET (neural network for bird identification)
- **ML Infrastructure**: Docker container
- **Network Tunnel**: ngrok
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **GPS**: Expo Location
- **Audio**: Expo AV

---

## Development

### Available Scripts

```bash
npm run dev          # Start Expo development server
npm run build:web    # Build web version (limited functionality)
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Code Style
- TypeScript throughout
- Comprehensive JSDoc comments on all services
- Functional React components with hooks
- Error boundaries and recovery

---

## Contributing

This is a proof of concept for research purposes. For production deployment:

1. Deploy BirdNET to permanent cloud infrastructure
2. Implement user authentication
3. Add offline queueing
4. Build standalone mobile apps
5. Set up monitoring and analytics
6. Implement on-device ML for offline operation

---

## License

Research/Educational Use

---

## Support

For questions about:
- **BirdNET**: https://github.com/kahst/BirdNET-Analyzer
- **Supabase**: https://supabase.io/docs
- **Expo**: https://docs.expo.dev
- **Swift Parrot**: https://www.birdlife.org.au/bird-profile/swift-parrot

---

## Acknowledgments

- **BirdNET**: Cornell Lab of Ornithology & Chemnitz University of Technology
- **Docker Image**: benjaminloeffel/birdnet-inference-api
- **Species Focus**: Swift Parrot (*Lathamus discolor*) - Critically Endangered
