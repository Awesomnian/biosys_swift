# Deployment & Testing Checklist

## Pre-Flight Verification (Do This EVERY Time)

### 1. Environment Configuration ✓
```bash
cat .env
```
**MUST contain:**
```
EXPO_PUBLIC_BIRDNET_SERVER_URL=https://pruinose-alise-uncooled.ngrok-free.dev
```

**If missing:** The app will fail with "Network request failed"

### 2. Code Changes Verification ✓
**Audio Recording Fix (audioCapture.ts:57):**
```bash
grep "Audio.Recording.createAsync" services/audioCapture.ts
```
Should return line 57 with `createAsync` - NOT `new Audio.Recording()`

**Enhanced Logging (detectionModelBirdNET.ts:193):**
```bash
grep "console.log('URL:'" services/detectionModelBirdNET.ts
```
Should return line 193 with URL logging

### 3. TypeScript Compilation ✓
```bash
npm run typecheck
```
Must complete with no errors

---

## Runtime Verification (Before Mobile Testing)

### 1. Docker Container Running
```bash
docker ps
```
**Must show:** `benjaminloeffel/birdnet-inference-api` with status "Up"

### 2. ngrok Tunnel Active
**Check PowerShell window for:**
```
Forwarding   https://pruinose-alise-uncooled.ngrok-free.dev -> http://localhost:8080
```

**If URL is different:** UPDATE .env immediately!

### 3. Local BirdNET Access
```bash
curl http://localhost:8080
```
Should return HTML (BirdNET API documentation)

### 4. Public ngrok Access
Open browser: https://pruinose-alise-uncooled.ngrok-free.dev
- Should show BirdNET API documentation
- May need to click "Visit Site" button first (ngrok free tier)

---

## Mobile App Testing

### 1. Force Quit Previous App
- iOS: Swipe up, swipe away Expo Go
- Android: Recent apps, swipe away Expo Go

### 2. Start Fresh
```bash
npm run dev
```
Scan QR code with phone

### 3. Grant Permissions
- Microphone: Required
- Location: Optional but recommended

### 4. Monitor Logs (npm run dev terminal)
**On app start, should see:**
```
BirdNET model initialized
Edge function URL: https://pruinose-alise-uncooled.ngrok-free.dev/inference/
```

### 5. Start Monitoring
Tap "Start Monitoring" button

**Within 5-10 seconds, should see:**
```
Sending audio to BirdNET server...
URL: https://pruinose-alise-uncooled.ngrok-free.dev/inference/
Blob size: XXXXX bytes
Response status: 200 OK
BirdNET analysis completed in XXXXms
```

### 6. Check ngrok Logs
**PowerShell ngrok window should show:**
```
POST /inference/ 200 OK
```
Repeating every ~5 seconds

### 7. App UI Verification
- "Segments Analyzed" increments every 5 seconds
- "Current Confidence" shows values (0.0-1.0)
- No error messages appear

---

## Success Criteria

✓ `.env` contains ngrok URL
✓ Audio recording uses `createAsync` method
✓ TypeScript compiles without errors
✓ Docker container is running
✓ ngrok tunnel is active and matches .env URL
✓ Browser can load ngrok URL
✓ App logs show successful BirdNET requests
✓ ngrok logs show POST requests with 200 status
✓ Segments counter increments continuously
✓ No errors for at least 1 minute of monitoring

---

## Common Failure Points (And How to Avoid Them)

### Issue: .env Missing ngrok URL
**Symptom:** "Network request failed" immediately
**Prevention:** Run `cat .env` before EVERY test session
**Fix:** Add URL back, restart app

### Issue: Wrong Audio Recording API
**Symptom:** "Cannot read property 'startAsync' of null"
**Prevention:** Run `grep createAsync services/audioCapture.ts`
**Fix:** Use `Audio.Recording.createAsync()` not `new Audio.Recording()`

### Issue: ngrok URL Changed
**Symptom:** "Network request failed" after restart
**Prevention:** Check ngrok console before starting app
**Fix:** Update .env with new URL, restart app

### Issue: Docker Not Running
**Symptom:** ngrok URL shows error in browser
**Prevention:** Run `docker ps` before testing
**Fix:** Start Docker Desktop, start container

---

## Emergency Reset Procedure

If everything is broken:

```bash
# 1. Stop everything
docker stop $(docker ps -q)
# Stop ngrok (Ctrl+C in PowerShell)

# 2. Restart Docker Desktop
# (Manual action required)

# 3. Start BirdNET container
docker run -d -p 8080:80 benjaminloeffel/birdnet-inference-api

# 4. Start ngrok (will get NEW URL!)
ngrok http 8080

# 5. Update .env with NEW ngrok URL
echo "EXPO_PUBLIC_BIRDNET_SERVER_URL=https://new-url.ngrok-free.dev" >> .env

# 6. Verify with browser
# Open: https://new-url.ngrok-free.dev

# 7. Restart mobile app
npm run dev
# Force quit Expo Go, scan QR code
```

---

## File Integrity Check

Run before every testing session:

```bash
# Check .env has ngrok URL
grep "EXPO_PUBLIC_BIRDNET_SERVER_URL" .env || echo "ERROR: Missing ngrok URL!"

# Check audio recording fix
grep "Audio.Recording.createAsync" services/audioCapture.ts || echo "ERROR: Wrong audio API!"

# Check enhanced logging
grep "console.log('URL:'" services/detectionModelBirdNET.ts || echo "ERROR: Missing logging!"
```

All three checks must pass.

---

## Notes for Developer

- **ngrok URL is not persistent:** Free tier generates new URL on every restart
- **`.env` file is critical:** Without ngrok URL, app cannot connect to server
- **Docker and ngrok must run continuously:** Restarting either may require configuration updates
- **Mobile app must be force quit:** Changes to .env require fresh app start
- **Browser test first:** If browser can't reach ngrok URL, app definitely won't work

---

## Testing with External Testers

External testers ONLY need:
1. Expo Go app installed
2. Your QR code or link
3. Internet connection

They do NOT need:
- Docker
- ngrok  
- BirdNET server
- To edit any configuration files

Your server handles everything. They just scan and test.

---

**Last Updated:** 2025-10-05
**Current ngrok URL:** https://pruinose-alise-uncooled.ngrok-free.dev
**Status:** All fixes verified and in place
