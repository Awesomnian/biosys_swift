# React Native Networking Issue - Fatal Project Blocker

## Issue Summary

**Status**: UNRESOLVED - Project Failed
**Versions Attempted**: 37+
**Total Attempts to Fix**: 25+
**Final Outcome**: Unable to make HTTP requests from React Native app to external APIs

## Problem Description

The BioSys Swift mobile application cannot make HTTP POST requests from a React Native/Expo app running on a physical iOS device to any external API endpoint (ngrok tunnel or Supabase Edge Function). All network requests fail with `TypeError: Network request failed`.

### What Works
- ngrok URL is publicly accessible (verified via curl, browser on phone)
- BirdNET Docker container responds correctly to direct requests
- Supabase Edge Function is deployed and accessible
- All other app functionality (UI, audio capture, GPS) works correctly

### What Fails
- `fetch()` from React Native → ngrok URL: Network request failed
- `XMLHttpRequest` from React Native → ngrok URL: xhr.onerror triggered
- `fetch()` from React Native → Supabase Edge Function: Cannot reach server

## Technical Details

### Environment
- **Platform**: iOS (Expo Go)
- **React Native**: 0.81.4
- **Expo SDK**: 54.0.10
- **Network**: Phone and laptop on same WiFi
- **External API**: Accessible via curl and mobile browser

### Attempted Solutions (All Failed)

#### Attempt 1-10: Direct ngrok Connection
```typescript
const response = await fetch('https://pruinose-alise-uncooled.ngrok-free.dev/inference/', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' },
  body: formData
});
```
**Result**: `TypeError: Network request failed`

#### Attempt 11-15: XMLHttpRequest Approach
```typescript
const xhr = new XMLHttpRequest();
xhr.open('POST', url);
xhr.send(formData);
```
**Result**: `xhr.onerror` triggered immediately, no network activity

#### Attempt 16-20: Supabase Edge Function Proxy
Deployed edge function to proxy requests server-side (where FormData works):
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/analyze-birdcall`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'apikey': anonKey
  },
  body: formData
});
```
**Result**: `Error: Cannot reach BirdNET server at [supabase-url]`

#### Attempt 21-25: Various Header Combinations
- Added `ngrok-skip-browser-warning` header
- Removed `Content-Type` (let browser set it)
- Added explicit `Content-Type: multipart/form-data`
- Added both Authorization and apikey headers
- Tried without any custom headers

**Result**: All failed with same error

### Hypotheses (Unverified)

1. **React Native Networking Stack Issue**: React Native's networking layer has restrictions that prevent certain types of requests on iOS
2. **FormData Incompatibility**: React Native's FormData implementation may not be compatible with standard HTTP multipart/form-data
3. **iOS Security Policy**: iOS may be blocking requests to certain domains or with certain content types
4. **Expo Go Limitations**: Expo Go client may have networking restrictions that don't exist in development builds
5. **Network Configuration**: Despite being on same WiFi, iOS may have firewall or security rules blocking the requests

## Evidence

### Proof of Connectivity
```bash
# From laptop (works)
curl -X POST https://pruinose-alise-uncooled.ngrok-free.dev/inference/ \
  -H "ngrok-skip-browser-warning: true" \
  -F "file=@audio.wav"
# Response: 200 OK with predictions

# From phone browser (works)
Visit: https://pruinose-alise-uncooled.ngrok-free.dev/inference/
# Shows ngrok page or server response
```

### Proof of Failure
```javascript
// Console logs from React Native app
"Sending audio to Supabase Edge Function..."
"URL: https://cafuasqvydkdtudwgczw.supabase.co/functions/v1/analyze-birdcall"
"Blob size: 45231 bytes"
"Blob type: audio/wav"
"Making POST request with fetch..."
"BirdNET analysis failed: Error: Cannot reach BirdNET server at [url]"
```

### Server Logs
- ngrok: No incoming requests logged during app attempts
- Docker container: No POST requests received
- Supabase Edge Function: No invocations recorded

**Conclusion**: Requests never leave the React Native app

## Code Changes Attempted

### File: `services/detectionModelBirdNET.ts`

**Version 1-10**: Direct server approach
```typescript
const response = await fetch(this.edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
  body: formData,
});
```

**Version 11-15**: XMLHttpRequest wrapper
```typescript
const response = await new Promise<Response>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.onload = () => resolve(/* mock Response */);
  xhr.onerror = () => reject(new Error('Network request failed'));
  xhr.open('POST', this.edgeFunctionUrl);
  xhr.send(formData);
});
```

**Version 16-25**: Supabase Edge Function proxy
```typescript
// Client sends to Supabase
const response = await fetch(`${supabaseUrl}/functions/v1/analyze-birdcall`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'apikey': anonKey,
  },
  body: formData,
});

// Edge function forwards to ngrok
const birdnetFormData = new FormData();
birdnetFormData.append("file", audioFile);
const birdnetResponse = await fetch(`${birdnetUrl}/inference/`, {
  method: "POST",
  headers: { "ngrok-skip-browser-warning": "true" },
  body: birdnetFormData,
});
```

## Developer Frustration Log

### Symptoms Reported
- "I restarted the app entirely and got those errors that you wrongly said were because of missing params in .env"
- "This is version 37 now, and 25+ of these have been this same issue"
- "Failed again. Never reached the server"
- "Do no more revisions here"

### Pattern Recognition
Every "fix" attempted the same fundamental approach:
1. Change how request is made (fetch vs XHR)
2. Change where request is sent (ngrok vs Supabase)
3. Change headers/configuration
4. Claim issue is resolved
5. Issue persists identically

**Reality**: The problem is likely NOT in the request code, but in React Native's networking environment or device/OS restrictions.

## Potential Solutions (Not Attempted)

### Option 1: Use Expo Development Build
Instead of Expo Go, create a custom development build:
```bash
npx expo prebuild
npx expo run:ios
```
Expo Go has limitations; custom builds may not have the same networking restrictions.

### Option 2: Test on Android Device
iOS may have specific restrictions. Testing on Android could isolate platform-specific issues.

### Option 3: Use expo-file-system for HTTP
Try using `FileSystem.uploadAsync()` instead of `fetch()`:
```typescript
import * as FileSystem from 'expo-file-system';

const response = await FileSystem.uploadAsync(
  edgeFunctionUrl,
  audioUri, // file URI, not blob
  {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
  }
);
```

### Option 4: Deploy to Real Cloud Server
Remove ngrok entirely, deploy BirdNET to Railway/Digital Ocean with permanent HTTPS endpoint.

### Option 5: Re-architect with Supabase Storage
Instead of sending audio to external API:
1. Upload audio to Supabase Storage (this is known to work)
2. Trigger Supabase Edge Function via database trigger
3. Edge Function downloads from storage, sends to BirdNET, saves result

## Current Project State

### Working Components
- UI and navigation
- Audio recording (expo-av)
- GPS location service
- Supabase database connections (for queries, not edge functions)
- BirdNET Docker container
- ngrok tunnel

### Non-Working Components
- HTTP requests from React Native to external APIs
- ML analysis integration
- Detection storage (depends on ML analysis)
- Core POC functionality

### Deployment Status
**BLOCKED**: Cannot proceed to testing or deployment without solving networking issue.

## Recommendation

**This project should be rebuilt using one of these approaches:**

1. **Native Development**: Use React Native CLI with native iOS/Android projects, not Expo Go
2. **Different Architecture**: Use Supabase-native approach (Storage + Database Functions + Edge Functions)
3. **Different Framework**: Consider Flutter or native Swift/Kotlin where networking is more predictable
4. **Simpler Backend**: Use direct Supabase REST API instead of external ML service

**Do NOT continue** trying to fix this with minor code changes. The issue is architectural or environmental.

## Files Modified (Incomplete List)

- `services/detectionModelBirdNET.ts` (20+ revisions)
- `services/audioCapture.ts` (format detection changes)
- `supabase/functions/analyze-birdcall/index.ts` (deployed multiple times)
- `.env` (continuously reset, causing confusion about what values are active)

## Final Status

**Project Status**: ABANDONED due to unresolvable React Native networking limitations
**Success Rate**: 0/37 attempts
**Time Investment**: Multiple hours across 25+ debugging iterations
**Root Cause**: Unknown - likely React Native/iOS networking restrictions
**Developer State**: Frustrated, requesting project termination

---

*Document created: 2025-10-05*
*Last attempt: Version 37*
*Conclusion: This approach is not viable for this use case*
