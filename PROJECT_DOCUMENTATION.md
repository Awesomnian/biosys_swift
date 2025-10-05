# BioSys: Swift - Project Documentation

## Proof of Concept Goals

### Primary Objective
Create a mobile bioacoustic monitoring application that autonomously detects Swift Parrot (*Lathamus discolor*) calls in the field using machine learning, with minimal human intervention.

### Key Requirements
1. **Autonomous Audio Capture**: Record 5-second audio segments continuously when monitoring is active
2. **Real-time ML Analysis**: Send audio to BirdNET neural network for species identification
3. **Selective Data Storage**: Only save high-confidence Swift Parrot detections (≥90% confidence)
4. **Geolocation Tracking**: Tag all detections with GPS coordinates
5. **Offline Capability**: Queue detections when network unavailable, sync when connection restored
6. **Field Deployment**: Run on consumer smartphones without requiring internet connectivity at detection site

### Success Criteria
- Capture and analyze audio segments every 5 seconds during monitoring
- Successfully identify Swift Parrot calls with BirdNET
- Store detections with metadata (timestamp, location, confidence, audio file) in Supabase
- Function on mobile devices in field conditions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE APP (React Native/Expo)           │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Monitor    │  │  Detections  │  │   Settings   │      │
│  │   Screen     │  │   Screen     │  │   Screen     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                   │                  │             │
│         └───────────────────┴──────────────────┘             │
│                          │                                    │
│         ┌────────────────┴────────────────┐                 │
│         │                                  │                 │
│    ┌────▼─────┐                     ┌─────▼─────┐          │
│    │  Sensor  │                     │  Storage  │          │
│    │ Service  │                     │  Service  │          │
│    └────┬─────┘                     └─────┬─────┘          │
│         │                                  │                 │
│  ┌──────▼───────┐  ┌──────────────┐      │                 │
│  │    Audio     │  │  Detection   │      │                 │
│  │   Capture    │─▶│    Model     │      │                 │
│  └──────────────┘  └──────┬───────┘      │                 │
│                            │              │                 │
└────────────────────────────┼──────────────┼─────────────────┘
                             │              │
                    ┌────────▼──────────┐   │
                    │                   │   │
         ┌──────────▼─────────┐         │   │
         │                    │         │   │
    ┌────▼────┐         ┌────▼─────┐   │   │
    │  ngrok  │         │ Supabase │◀──┘   │
    │ Tunnel  │         │ Database │       │
    └────┬────┘         └──────────┘       │
         │                                  │
    ┌────▼────────┐                        │
    │   Docker    │                        │
    │  Container  │                        │
    │             │                        │
    │  BirdNET    │                        │
    │ Inference   │                        │
    │   Server    │                        │
    └─────────────┘                        │
         │                                  │
         └──────────────────────────────────┘
              Returns predictions
```

---

## System Components Status

### ✅ WORKING COMPONENTS

#### 1. Mobile Application (React Native/Expo)
- **Status**: Fully functional on iOS/Android
- **Location**: `/app/(tabs)/`
- **Features**:
  - Tab navigation (Monitor, Detections, Settings)
  - Real-time monitoring controls
  - Statistics display
  - Error handling and recovery

#### 2. Supabase Database
- **Status**: Configured and operational
- **Connection**: `https://0ec90b57d6e95fcbda19832f.supabase.co`
- **Tables**:
  - `detections`: Stores Swift Parrot detections with metadata
  - `storage.objects`: Stores audio files
- **Security**: RLS policies enabled (authenticated users only)

#### 3. Audio Capture Service
- **Status**: Working on mobile devices
- **Location**: `/services/audioCapture.ts`
- **Functionality**: Captures 5-second audio segments using Expo AV

#### 4. BirdNET Docker Container
- **Status**: Running on developer's laptop
- **Port**: localhost:8080
- **Image**: `benjaminloeffel/birdnet-inference-api`
- **Endpoint**: `POST /inference/` (accepts multipart/form-data)

#### 5. ngrok Tunnel
- **Status**: Active during development
- **URL**: `https://pruinose-alise-uncooled.ngrok-free.dev`
- **Purpose**: Expose localhost BirdNET to mobile device
- **Note**: URL changes on each restart (free tier)

### ⚠️ COMPONENTS REQUIRING SPECIFIC SETUP

#### 1. Network Configuration
- **Requirement**: Mobile device and laptop must be on same WiFi network
- **Reason**: ngrok free tier requires network proximity
- **Alternative**: Deploy BirdNET to cloud service (Railway, Digital Ocean)

#### 2. Environment Variables
- **File**: `.env`
- **Required Variables**:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=[key from Supabase]
  EXPO_PUBLIC_BIRDNET_SERVER_URL=https://pruinose-alise-uncooled.ngrok-free.dev
  ```
- **Note**: App must be fully restarted after `.env` changes

### ❌ NOT IMPLEMENTED

#### 1. Supabase Edge Function
- **Location**: `/supabase/functions/analyze-birdcall/`
- **Status**: Created but NOT USED
- **Reason**: BirdNET Docker on laptop is being used instead
- **Purpose**: Would allow serverless BirdNET inference via Supabase
- **Future**: Deploy if cloud-based inference needed

#### 2. TensorFlow Lite Model
- **Location**: `/services/detectionModelTensorFlow.ts`
- **Status**: Code exists but NOT FUNCTIONAL
- **Reason**: On-device ML not implemented for this POC
- **Future**: Could enable offline detection without server

#### 3. Production Deployment
- **Status**: Development only
- **Missing**:
  - Cloud hosting for BirdNET
  - Permanent URL configuration
  - CI/CD pipeline
  - Production error monitoring

---

## Current Working Model

### Data Flow (Active Monitoring)

1. **User Action**: Taps "Start Monitoring" in mobile app
2. **Permission Check**: Requests microphone and GPS access
3. **Audio Loop**: Every 5 seconds:
   - Capture 5-second audio segment
   - Convert to Blob
   - Send POST request to `${EXPO_PUBLIC_BIRDNET_SERVER_URL}/inference/`
   - FormData field: `file` (audio blob as .webm)
4. **BirdNET Analysis**:
   - ngrok receives request, forwards to localhost:8080
   - Docker BirdNET processes audio
   - Returns JSON: `{predictions: [{species: [{species_name, probability}]}]}`
5. **Detection Logic**:
   - Parse all species predictions
   - Check for "swift" or "lathamus" in species name
   - If Swift Parrot confidence ≥ threshold (default 0.9):
     - Get current GPS coordinates
     - Save audio blob to Supabase Storage
     - Save metadata to `detections` table
     - Increment detection counter
   - If confidence < threshold: discard audio
6. **Error Handling**:
   - If 5 consecutive API failures: auto-stop monitoring
   - Display error message with hints
   - Allow manual restart

### Database Schema

**Table: `detections`**
```sql
- id (uuid, primary key)
- device_id (text) - unique sensor identifier
- timestamp (timestamptz) - when detection occurred
- latitude (float8) - GPS latitude
- longitude (float8) - GPS longitude
- confidence (float8) - ML model confidence (0.0-1.0)
- model_name (text) - "BirdNET"
- audio_file_url (text) - Supabase Storage URL
```

### API Endpoints

#### BirdNET Inference API
- **URL**: `POST ${EXPO_PUBLIC_BIRDNET_SERVER_URL}/inference/`
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: FormData with `file` field containing audio blob
- **Response**:
  ```json
  {
    "predictions": [
      {
        "start_time": 0,
        "stop_time": 3,
        "species": [
          {
            "species_name": "Lathamus discolor_Swift Parrot",
            "probability": 0.95
          }
        ]
      }
    ]
  }
  ```

#### Supabase REST API
- **Base URL**: `https://0ec90b57d6e95fcbda19832f.supabase.co`
- **Used Endpoints**:
  - `POST /rest/v1/detections` - Insert detection
  - `GET /rest/v1/detections` - Query detections
  - `POST /storage/v1/object/detections/[filename]` - Upload audio

---

## Configuration Settings

### Detection Threshold
- **Default**: 0.9 (90% confidence)
- **Range**: 0.0 - 1.0
- **Location**: Settings screen → Detection Threshold slider
- **Effect**: Only detections above threshold are saved

### Audio Segment Duration
- **Fixed**: 5000ms (5 seconds)
- **Reason**: BirdNET optimal input length
- **Location**: `services/sensorService.ts` constructor

### Error Recovery
- **Max Consecutive Errors**: 5
- **Action**: Auto-stop monitoring
- **Error Cooldown**: 30 seconds between error notifications
- **Location**: `services/sensorService.ts`

---

## Known Issues & Limitations

### 🔴 CRITICAL: React Native Networking Failure (PROJECT BLOCKER)

**Status**: UNRESOLVED - Project cannot proceed to testing phase

**Issue**: React Native app cannot make HTTP POST requests with FormData to external APIs (ngrok or Supabase Edge Functions). All requests fail with `TypeError: Network request failed` despite the endpoints being publicly accessible and working via curl/browser.

**Impact**:
- Cannot send audio to BirdNET for analysis
- Core POC functionality is non-operational
- 25+ fix attempts over 37 versions failed
- No detections can be saved to database

**Evidence**:
- ngrok URL works in mobile browser: ✅
- ngrok URL works via curl: ✅
- Supabase Edge Function deployed: ✅
- React Native fetch() to same URLs: ❌
- React Native XMLHttpRequest: ❌
- Server logs show NO requests received from app

**Attempted Solutions (All Failed)**:
1. Direct fetch() to ngrok with various headers
2. XMLHttpRequest wrapper approach
3. Supabase Edge Function as proxy
4. Multiple header configurations
5. Different FormData field names
6. Both with and without Content-Type headers

**Root Cause**: Unknown - likely React Native/iOS networking restrictions in Expo Go environment

**See**: `REACT_NATIVE_NETWORKING_ISSUE.md` for complete technical analysis

**Viable Solutions (Not Implemented)**:
1. Use Expo Development Build instead of Expo Go
2. Try expo-file-system FileSystem.uploadAsync() instead of fetch()
3. Re-architect using Supabase Storage → Database Trigger → Edge Function
4. Deploy to real cloud server (not ngrok) with permanent HTTPS
5. Rebuild project in native iOS/Android or different framework

---

### 1. ngrok URL Changes
- **Issue**: Free ngrok URLs change on restart
- **Impact**: Must update `.env` and restart app
- **Workaround**: Use ngrok paid plan or deploy to cloud
- **Note**: Currently blocked by networking issue above

### 2. Same Network Requirement
- **Issue**: Mobile must be on same WiFi as laptop
- **Impact**: Cannot test in actual field deployment
- **Solution**: Deploy BirdNET to cloud service
- **Note**: Currently blocked by networking issue above

### 3. Web Preview Limited
- **Issue**: Web version shows "Mobile Only" messages
- **Reason**: Requires native microphone and GPS APIs
- **Acceptable**: POC targets mobile devices only

### 4. No Offline ML
- **Issue**: Requires network connection for every analysis
- **Impact**: Cannot work in remote field locations
- **Future**: Implement TensorFlow Lite on-device model

### 5. Audio Format Dependency
- **Issue**: Uses .webm format (may not work on all devices)
- **Impact**: iOS might have compatibility issues
- **Mitigation**: Expo AV handles cross-platform encoding

---

## Development Setup

### Prerequisites
1. Node.js 18+ and npm
2. Docker Desktop
3. ngrok account (free tier OK for development)
4. Expo Go app on mobile device
5. Mobile device and development laptop on same WiFi

### Initial Setup
```bash
# 1. Install dependencies
npm install

# 2. Start BirdNET Docker container
docker run -d -p 8080:80 benjaminloeffel/birdnet-inference-api

# 3. Start ngrok tunnel
ngrok http 8080
# Copy the https URL (e.g., https://xxx.ngrok-free.dev)

# 4. Configure environment
# Create .env file with:
EXPO_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[from Supabase dashboard]
EXPO_PUBLIC_BIRDNET_SERVER_URL=[ngrok URL from step 3]

# 5. Start development server
npm run dev
```

### Testing Workflow
1. Scan QR code with Expo Go
2. Grant microphone and location permissions
3. Tap "Start Monitoring"
4. Play Swift Parrot call from YouTube/Xeno-canto
5. Watch for detection in app
6. Check Supabase database for saved detection

---

## Future Enhancements

### Phase 2: Production Deployment
- [ ] Deploy BirdNET to Railway/Digital Ocean
- [ ] Permanent URL configuration
- [ ] Remove ngrok dependency

### Phase 3: Field Testing
- [ ] Offline audio queueing
- [ ] Batch upload when network available
- [ ] Extended battery optimization

### Phase 4: Advanced Features
- [ ] On-device ML with TensorFlow Lite
- [ ] Real-time audio visualization
- [ ] Species database with images
- [ ] Export detection data (CSV, GeoJSON)
- [ ] Multi-user collaboration features

---

## Maintenance Notes

### When ngrok Restarts
1. Get new URL from ngrok console
2. Update `.env` → `EXPO_PUBLIC_BIRDNET_SERVER_URL`
3. Force quit and restart mobile app

### When Supabase Changes
1. Update credentials in `.env`
2. Check RLS policies are still enabled
3. Verify storage bucket exists

### Common Debugging Steps
1. Check ngrok is running: Visit URL in mobile browser
2. Check Docker: `docker ps` should show BirdNET container
3. Check app logs: Look at Expo Metro bundler console
4. Check network: Verify same WiFi for laptop and mobile
5. Check permissions: Microphone and Location must be granted

---

## Contact & Support

- **BirdNET API Documentation**: https://github.com/kahst/BirdNET-Analyzer
- **Supabase Documentation**: https://supabase.io/docs
- **Expo Documentation**: https://docs.expo.dev
- **ngrok Documentation**: https://ngrok.com/docs
