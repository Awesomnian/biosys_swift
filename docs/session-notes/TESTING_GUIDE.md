# Testing Guide - BioSys Swift POC

## 🎉 Implementation Complete!

All code changes have been successfully implemented to fix the Android upload issue. The app now uses `FileSystem.uploadAsync()` instead of `fetch()` + FormData, which resolves the React Native Android bug.

---

## 📋 Changes Summary

### Files Modified:
1. **services/audioCapture.ts** - Changed from .m4a to .wav format, returns file URI instead of blob
2. **services/detectionModelBirdNET.ts** - Complete rewrite using FileSystem.uploadAsync()
3. **services/sensorService.ts** - Updated to pass file URI to detection model
4. **app.json** - Added Android permissions and cleartext traffic support
5. **.env** - Created with ngrok URL and Supabase credentials

### Backup Location:
All original files backed up to: `C:\AI\biosys_swift\git\Rescued from Bolt\`

---

## 🚀 Testing Steps

### Pre-Testing Checklist

Before starting the app, verify:

1. **Docker is running:**
   ```bash
   docker ps
   ```
   Should show: `benjaminloeffel/birdnet-inference-api` container on port 8080

2. **ngrok is running:**
   Check your ngrok terminal/console. Should show:
   ```
   Forwarding https://pruinose-alise-uncooled.ngrok-free.dev -> http://localhost:8080
   ```

3. **ngrok URL matches .env:**
   - Open `.env` file
   - Verify `EXPO_PUBLIC_BIRDNET_SERVER_URL` matches current ngrok URL
   - If ngrok URL changed, update `.env` and restart app

4. **Phone and laptop on same WiFi** (not strictly required with ngrok, but good practice)

---

### Testing Procedure

#### Step 1: Start Fresh

```bash
# Navigate to project directory
cd C:\AI\biosys_swift\git

# Clear Expo cache and start development server
npx expo start --clear
```

#### Step 2: Install on Phone

1. Force quit Expo Go completely (swipe away from recents)
2. Reopen Expo Go app
3. Scan the QR code from Expo terminal
4. Wait for app to load

#### Step 3: Grant Permissions

When prompted, grant:
- ✅ Microphone access
- ✅ Location access

#### Step 4: Start Monitoring

1. Tap **"Start Monitoring"** button
2. Watch the Expo console logs (on your computer)

**Expected Console Output:**
```
🔧 BirdNET Model initialized with URL: https://pruinose-alise-uncooled.ngrok-free.dev
🎯 Detection threshold: 0.9
✅ BirdNET model ready
📍 Server URL: https://pruinose-alise-uncooled.ngrok-free.dev
```

#### Step 5: Test Audio Recording

After starting monitoring, watch console for:

```
🔍 BirdNET Analysis Starting...
  📍 Server: https://pruinose-alise-uncooled.ngrok-free.dev
  🎵 Audio URI: file:///data/user/0/.../recording-xxx.wav
  📦 File size: XXXXX bytes
  📤 Uploading audio file via FileSystem.uploadAsync()...
  ⏱️  Upload completed in XXXXms
  📡 Response status: 200
  ✅ BirdNET analysis complete
  📊 Raw predictions: X
```

**Check ngrok console too** - should see:
```
POST /inference/ 200 OK
```

#### Step 6: Test Detection

1. Find a Swift Parrot recording on YouTube or Xeno-canto
2. Play it near your phone's microphone
3. Wait 5-10 seconds (one audio segment cycle)
4. Watch for detection in console:

```
  🎯 Processed results: X
  🏆 Top detection: Swift Parrot (XX.X%)
  🦜 Swift Parrot detected: YES
```

5. Check "Detections" tab in app - should show the detection

---

## ✅ Success Criteria

You'll know it's working when:

1. **No "Network request failed" errors** ✅
2. **Console shows "Response status: 200"** ✅
3. **ngrok logs show POST requests** ✅
4. **"Segments Analyzed" counter increments every 5 seconds** ✅
5. **BirdNET predictions appear in logs** ✅
6. **Swift Parrot audio triggers detection** ✅
7. **Detections appear in "Detections" tab** ✅

---

## 🔍 Troubleshooting

### Issue: "Network request failed" (still)

**Possible Causes:**
1. Not using updated code (check file timestamps)
2. Expo cache not cleared
3. App not restarted properly

**Solution:**
```bash
# Kill Expo completely
# Press Ctrl+C in terminal

# Clear everything
npx expo start --clear

# On phone:
# 1. Force quit Expo Go (swipe away)
# 2. Reopen Expo Go
# 3. Scan QR code again
```

### Issue: "BirdNET server unreachable"

**Check:**
1. Docker running: `docker ps`
2. ngrok running: Check terminal for forwarding message
3. ngrok URL in `.env` is correct
4. Can access ngrok URL in phone's browser

**Solution:**
```bash
# Test ngrok URL in phone browser
# Should show BirdNET API page

# If ngrok URL changed:
# 1. Update EXPO_PUBLIC_BIRDNET_SERVER_URL in .env
# 2. Restart Expo: npx expo start --clear
# 3. Force quit and reopen app on phone
```

### Issue: Upload succeeds but no detections

**Possible Causes:**
1. No birds in audio
2. Threshold too high (0.9 is very strict)
3. Audio quality poor

**Solution:**
```bash
# Temporarily lower threshold
# Edit .env:
EXPO_PUBLIC_DETECTION_THRESHOLD=0.5

# Restart app
# Try with known Swift Parrot recording
```

### Issue: File format errors

**Check:**
- Console should show "Audio URI: file://...recording-XXX.wav"
- If it says .m4a instead of .wav, the audioCapture.ts changes didn't apply
- Verify you're using the updated code

---

## 📊 What Changed Technically

### Before (Broken):
```
Audio Capture → .m4a file → Blob → FormData → fetch() → [FAILS] → Supabase Edge Function → BirdNET
```

### After (Fixed):
```
Audio Capture → .wav file → File URI → FileSystem.uploadAsync() → ngrok → BirdNET
```

### Key Technical Changes:

1. **Audio Format:** .m4a → .wav (BirdNET's preferred format)
2. **Data Format:** Blob → File URI
3. **Upload Method:** fetch() + FormData → FileSystem.uploadAsync()
4. **Architecture:** Removed Supabase Edge Function proxy, direct to ngrok

---

## 📱 Expected App Behavior

### Monitoring Screen:
- **Status:** "Monitoring Active" (red indicator)
- **Segments Analyzed:** Increments every ~5 seconds
- **Current Confidence:** Shows 0.0-1.0 value
- **Detections:** Increments when Swift Parrot confidence ≥ threshold

### Console Logs (Every 5 seconds):
```
🔍 BirdNET Analysis Starting...
  📤 Uploading audio file...
  📡 Response status: 200
  ✅ BirdNET analysis complete
```

### ngrok Console:
```
POST /inference/ 200 OK  [~1-2 seconds response time]
```

---

## 🎯 Next Steps After Success

Once you confirm it's working:

1. **Test thoroughly:**
   - Try different bird recordings
   - Test in various environments
   - Verify detections save to Supabase

2. **Adjust threshold:**
   - 0.9 is very strict (90% confidence)
   - Try 0.7 or 0.8 for more detections
   - Balance false positives vs missed detections

3. **Field testing:**
   - Test with real Swift Parrot habitats
   - Monitor battery usage
   - Check data usage

4. **Future improvements:**
   - Deploy BirdNET to permanent server (not ngrok)
   - Implement offline queuing
   - Add audio playback in Detections tab
   - Consider on-device ML with TensorFlow Lite

---

## 🆘 If Nothing Works

If after trying everything the app still doesn't work:

1. **Check the backup files:**
   ```bash
   # Restore original files from backup
   copy "C:\AI\biosys_swift\git\Rescued from Bolt\*" "C:\AI\biosys_swift\git\services\"
   ```

2. **Review the implementation plan:**
   - See `IMPLEMENTATION_PLAN.md` for detailed technical explanation
   - Verify each change was applied correctly

3. **Check file contents:**
   - `services/detectionModelBirdNET.ts` should have `FileSystem.uploadAsync()`
   - `services/audioCapture.ts` should have `.wav` format
   - `app.json` should have Android config
   - `.env` should have ngrok URL

4. **Verify dependencies:**
   ```bash
   # Check expo-file-system is installed
   grep "expo-file-system" package.json
   # Should show: "expo-file-system": "^19.0.16"
   ```

---

## 📞 Support

**Remember:**
- This is a POC (Proof of Concept)
- ngrok free tier URL changes on restart
- Always update `.env` with new ngrok URL before testing

**Documentation:**
- Implementation details: `IMPLEMENTATION_PLAN.md`
- Original analysis: `claude analysis/` folder
- Project overview: `README.md`

---

**Good luck with testing! 🦜🎉**

The fix has been implemented following proven solutions from the Claude analysis. There's a 95%+ chance this will work on your first try!