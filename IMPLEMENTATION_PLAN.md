# BioSys Swift - Implementation Plan to Fix Upload Issue

## Executive Summary

**Problem**: React Native FormData uploads fail on Android with "Network request failed"  
**Root Cause**: Known React Native bug with FormData on Android  
**Solution**: Replace fetch()+FormData with FileSystem.uploadAsync()  
**Estimated Time**: 1-2 hours  
**Confidence**: 95%+ (proven solution from Claude analysis)

---

## Current State Analysis

### What's Broken
- `detectionModelBirdNET.ts` uses FormData + fetch() via Supabase Edge Function
- Audio captured as Blob, converted from .m4a file
- Network requests fail on Android before reaching server
- 37 versions attempted, all with same fundamental issue

### What Works
- Audio recording (expo-av) ✅
- GPS location tracking ✅
- UI and navigation ✅
- BirdNET Docker container ✅
- ngrok tunnel: https://pruinose-alise-uncooled.ngrok-free.dev ✅
- Supabase database (for queries) ✅

### Key Insight
The issue isn't server-side or network-side - it's React Native's FormData implementation on Android. The solution is to bypass React Native's networking layer entirely using native upload APIs.

---

## Solution Architecture

### Before (Broken)
```
Audio → Blob → FormData → fetch() → [FAILS] → Supabase Edge Function → BirdNET
```

### After (Fixed)
```
Audio → WAV file → FileSystem.uploadAsync() → ngrok → Docker BirdNET
```

### Key Changes
1. **Audio Format**: .m4a → .wav (BirdNET's preferred format)
2. **Data Format**: Blob → File URI
3. **Upload Method**: fetch()+FormData → FileSystem.uploadAsync()
4. **Architecture**: Remove Supabase Edge Function proxy, use direct ngrok connection

---

## Implementation Steps

### Step 1: Create Backup
Create `C:\AI\biosys_swift\git\Rescued from Bolt\` folder with copies of:
- services/audioCapture.ts
- services/detectionModelBirdNET.ts
- services/sensorService.ts
- app.json

### Step 2: Update Audio Capture Service
**File**: `services/audioCapture.ts`

**Changes**:
1. Change audio format from `.m4a` to `.wav`
2. Return file URI instead of converting to Blob
3. Keep file on disk (don't delete immediately)

**Key Code**:
```typescript
// Change format to WAV
android: {
  extension: '.wav',
  outputFormat: Audio.AndroidOutputFormat.DEFAULT,
  audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
}

// Return URI, not blob
export interface AudioSegment {
  uri: string;  // Changed from blob: Blob
  timestamp: Date;
  duration: number;
}
```

### Step 3: Rewrite BirdNET Detection Model
**File**: `services/detectionModelBirdNET.ts`

**Complete Rewrite** using Claude's copy_paste_solution.ts as template:

**Key Changes**:
1. Import: `import * as FileSystem from 'expo-file-system/legacy'`
2. Remove all Supabase Edge Function code
3. Use direct ngrok URL: `https://pruinose-alise-uncooled.ngrok-free.dev`
4. Change `analyzeAudio(audioBlob: Blob)` to `analyzeAudio(audioUri: string)`
5. Replace fetch() with FileSystem.uploadAsync()
6. Parse response with JSON.parse(response.body)

**Critical Implementation**:
```typescript
async analyzeAudio(audioUri: string): Promise<DetectionResult> {
  const uploadOptions: FileSystem.FileSystemUploadOptions = {
    fieldName: 'audio',
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    headers: {
      'Accept': 'application/json',
    },
  };

  const response = await FileSystem.uploadAsync(
    `${this.serverUrl}/inference/`,
    audioUri,
    uploadOptions
  );

  const data = JSON.parse(response.body);
  return this.transformBirdNETResponse(data);
}
```

### Step 4: Update Sensor Service
**File**: `services/sensorService.ts`

**Changes**:
1. Update `handleAudioSegment` to pass URI instead of blob
2. Update type signature from `AudioSegment.blob` to `AudioSegment.uri`

**Key Code**:
```typescript
private async handleAudioSegment(segment: AudioSegment): Promise<void> {
  // Change from: segment.blob
  // To: segment.uri
  const result = await this.detectionModel.analyzeAudio(segment.uri);
  
  // ... rest of logic unchanged
}
```

### Step 5: Update App Configuration
**File**: `app.json`

**Add Android Configuration**:
```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true,
      "package": "com.biosys.swift",
      "permissions": [
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "INTERNET",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

### Step 6: Create Environment File
**File**: `.env`

**Content**:
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjBlYzkwYjU3ZDZlOTVmY2JkYTE5ODMyZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI4MDgxNzMzLCJleHAiOjIwNDM2NTc3MzN9.Lv6j3uC11dLOqFtMWpx6hC4ZMY7LvD5_H_fRKgKdN7M

# BirdNET Server (ngrok tunnel)
EXPO_PUBLIC_BIRDNET_SERVER_URL=https://pruinose-alise-uncooled.ngrok-free.dev
```

**Important**: This URL changes when ngrok restarts!

---

## Testing Plan

### Pre-Testing Checklist
- [ ] Docker running: `docker ps` shows birdnet container
- [ ] ngrok running: Shows forwarding to localhost:8080
- [ ] Can access ngrok URL in phone browser
- [ ] Backup folder created with old code

### Test Sequence

**Test 1: Audio Recording**
1. Start app, grant microphone permission
2. Check logs for WAV file creation
3. Expected: File URI like `file:///data/.../recording-xxx.wav`

**Test 2: Server Connection**
1. App should log: "BirdNET Model initialized with URL: https://..."
2. Expected: No errors on startup

**Test 3: File Upload**
1. Tap "Start Monitoring"
2. Watch logs for upload attempt
3. Expected console output:
   ```
   🔍 BirdNET Analysis Starting...
   📤 Uploading audio file...
   📡 Response status: 200
   ✅ BirdNET analysis complete
   ```
4. Check ngrok logs for POST requests
5. Expected: `POST /inference/ 200 OK`

**Test 4: Detection**
1. Play Swift Parrot recording from phone speaker
2. Wait 5-10 seconds
3. Expected: Detection appears, confidence shown
4. Check Detections tab for saved result

### Success Criteria
✅ No "Network request failed" errors  
✅ Console shows "Response status: 200"  
✅ ngrok logs show incoming POST requests  
✅ BirdNET returns predictions  
✅ Swift Parrot audio triggers detection  
✅ Files saved to Supabase Storage  

---

## Rollback Plan

If something goes wrong:

```bash
# Navigate to project
cd C:\AI\biosys_swift\git

# Copy backup files back
copy "Rescued from Bolt\audioCapture.ts" services\
copy "Rescued from Bolt\detectionModelBirdNET.ts" services\
copy "Rescued from Bolt\sensorService.ts" services\
copy "Rescued from Bolt\app.json" .

# Clear cache and restart
npx expo start --clear
```

---

## Expected Outcomes

### Immediate Results
- Audio uploads reach BirdNET server
- Status 200 responses received
- Predictions returned successfully
- No more "Network request failed" errors

### Long-term Benefits
- Reliable Android operation
- Faster uploads (native API is more efficient)
- Better error messages
- Foundation for offline queuing

---

## Technical Notes

### Why FileSystem.uploadAsync() Works
- Uses Android's native HTTP client directly
- Bypasses React Native's networking layer
- Handles multipart/form-data correctly
- Well-tested by Expo team

### Why .wav Format
- BirdNET's preferred input format
- No lossy compression
- Better ML accuracy
- Simpler processing pipeline

### Why Direct ngrok Connection
- Removes unnecessary proxy layer
- Faster (one less hop)
- Simpler debugging
- Fewer points of failure

---

## File Change Summary

| File | Change Type | Lines Modified |
|------|-------------|----------------|
| audioCapture.ts | Modify | ~50 lines |
| detectionModelBirdNET.ts | Rewrite | ~320 lines |
| sensorService.ts | Modify | ~5 lines |
| app.json | Add | ~10 lines |
| .env | Create | New file |

**Total**: 1 new file, 4 modified files

---

## Next Steps After Success

1. **Test thoroughly** with various scenarios
2. **Update documentation** (README, CURRENT_STATUS, etc.)
3. **Clean up old edge function** code (remove if not needed)
4. **Consider improvements**:
   - Permanent BirdNET server (not ngrok)
   - Offline audio queuing
   - On-device ML with TensorFlow Lite
   - Progress indicators for uploads

---

## Questions & Answers

**Q: What if ngrok URL changes?**  
A: Update EXPO_PUBLIC_BIRDNET_SERVER_URL in .env, restart app

**Q: Will this work on iOS too?**  
A: Yes! FileSystem.uploadAsync() works on both platforms

**Q: What about the Supabase Edge Function?**  
A: We're bypassing it entirely. Can delete if not needed elsewhere.

**Q: File size with WAV format?**  
A: 5 seconds at 44.1kHz mono ≈ 430KB. Acceptable for POC.

**Q: What if uploads still fail?**  
A: Check Docker/ngrok are running, phone has internet, ngrok URL is correct

---

## Implementation Timeline

| Task | Estimated Time |
|------|----------------|
| Create backups | 2 min |
| Update audioCapture.ts | 10 min |
| Rewrite detectionModelBirdNET.ts | 20 min |
| Update sensorService.ts | 5 min |
| Update app.json | 3 min |
| Create .env | 2 min |
| Testing | 30 min |
| Documentation | 15 min |
| **TOTAL** | **~90 min** |

---

## Confidence Assessment

**95% confident this will work** because:
1. Solution proven by Claude's analysis
2. Thousands of developers use this exact fix
3. FileSystem.uploadAsync() is well-tested
4. All infrastructure already working (Docker, ngrok, etc.)

The 5% uncertainty accounts for:
- Possible BirdNET API quirks
- Environment-specific issues
- Unexpected Android version differences

---

**Ready to implement. Let's fix this!**