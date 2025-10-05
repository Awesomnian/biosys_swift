# BioSys: Swift - Swift Parrot Bioacoustic Monitoring App

A proof-of-concept mobile application for autonomous detection and monitoring of Swift Parrot (*Lathamus discolor*) calls using machine learning.

## Project Status: POC Complete ✅

This is a working proof of concept demonstrating:
- Real-time audio capture on mobile devices
- Cloud-based bird species identification via BirdNET
- Selective storage of high-confidence Swift Parrot detections
- GPS geolocation tagging
- Autonomous field deployment capability

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

### Network Requirements
- ⚠️ Mobile device and laptop must be on same WiFi
- ⚠️ ngrok URL changes on each restart (free tier)
- ⚠️ No offline detection (requires network for every analysis)

### Platform Restrictions
- ⚠️ Web version non-functional (mobile-only)
- ⚠️ Requires Expo Go or custom build
- ⚠️ Cannot test in actual remote field locations

### Future Enhancements
- Deploy BirdNET to cloud (Railway, Digital Ocean)
- Implement on-device ML with TensorFlow Lite
- Offline audio queueing and batch upload
- Audio playback of detections
- Species information and images
- Data export (CSV, GeoJSON)

---

## Documentation

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
