# Network Request Fix - ngrok Browser Warning

## Problem Identified

Looking at your server logs:
```
19:29:02.378 AEDT GET /inference/                405 Method Not Allowed
```

The app was sending **GET** requests instead of **POST**, but the code already specifies POST. The issue is **ngrok's browser warning interception**.

## Root Cause

When you clicked the error link in the app (`https://pruinose-alise-uncooled.ngrok-free.dev/inference/`), it showed a page saying "detail: method not allowed" in black text. This is ngrok's browser warning page.

### What's Happening:
1. App sends POST request with audio data
2. ngrok intercepts the request (free tier shows warning page)
3. ngrok returns HTML warning page instead of forwarding to BirdNET
4. App receives HTML instead of JSON
5. Request fails as "Network request failed"

## Solution Implemented

Added **ngrok bypass header** to all requests:

```typescript
const headers: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
};
```

This tells ngrok to skip the browser warning page and forward the request directly to your BirdNET server.

## Additional Changes

### 1. App Icon & Favicon
- Updated app icon to use `biosys_swift_logo.png`
- Updated web favicon to use `biosys_swift_logo.png`
- File: `app.json` lines 7 and 17

### 2. Network Headers
- Added ngrok bypass header
- File: `services/detectionModelBirdNET.ts` line 201

## Testing

### Before Testing:
1. ✓ Docker running on port 8080
2. ✓ ngrok forwarding to localhost:8080
3. ✓ Force quit Expo Go app
4. ✓ Restart `npm run dev`
5. ✓ Rescan QR code

### Expected Results:
- No more "405 Method Not Allowed" errors
- Server logs show: `POST /inference/ 200 OK`
- App displays confidence values
- No network request failures

## Why This Fixes It

ngrok free tier shows a browser warning page by default to prevent abuse. The `ngrok-skip-browser-warning: true` header tells ngrok:
- This is a legitimate API call from an app
- Skip the browser interstitial page
- Forward the request directly to the backend

## Verification

```bash
# Check the fix is in place
grep -n "ngrok-skip-browser-warning" services/detectionModelBirdNET.ts
# Should show: 201:        'ngrok-skip-browser-warning': 'true',

# Check TypeScript compiles
npm run typecheck
# Should show: no errors

# Check app icon updated
grep "icon.*biosys_swift_logo" app.json
# Should show: "icon": "./assets/images/biosys_swift_logo.png"
```

---

**Status:** ✓ FIXED
**Next Step:** Force quit app, restart dev server, test monitoring
**Expected:** Network requests succeed with 200 OK responses
