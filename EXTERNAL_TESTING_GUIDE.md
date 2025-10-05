# BioSys: Swift - External Testing Guide

**For Remote Testers (Not on Developer's Network)**

This guide explains how to set up and test the Swift Parrot bioacoustic monitoring app on your own device, independent of the developer's infrastructure.

---

## Overview

Since the current proof of concept uses Docker and ngrok running on the developer's machine, you'll need to set up your own BirdNET server locally. This takes about 10-15 minutes.

**What You'll Need:**
- A laptop/desktop computer (Windows, Mac, or Linux)
- A smartphone (iOS or Android)
- Same WiFi network for both devices
- About 2 GB free disk space

---

## Step 1: Install Prerequisites

### 1.1 Install Node.js
- Visit: https://nodejs.org/
- Download and install the **LTS version** (18.x or higher)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 1.2 Install Docker Desktop
- **Windows/Mac**: https://www.docker.com/products/docker-desktop/
- **Linux**: https://docs.docker.com/engine/install/
- Start Docker Desktop after installation
- Verify Docker is running:
  ```bash
  docker --version
  ```

### 1.3 Install ngrok
- Visit: https://ngrok.com/
- Create a free account
- Download ngrok for your platform
- Follow the setup instructions to authenticate:
  ```bash
  ngrok config add-authtoken YOUR_TOKEN
  ```

### 1.4 Install Expo Go on Your Phone
- **iOS**: https://apps.apple.com/app/expo-go/id982107779
- **Android**: https://play.google.com/store/apps/details?id=host.exp.exponent

---

## Step 2: Get the Project Code

### 2.1 Download the Project
You should receive a ZIP file or repository URL from the developer. Extract it to a folder on your computer.

### 2.2 Install Dependencies
Open a terminal/command prompt in the project folder:
```bash
cd path/to/biosys-swift
npm install
```

This will take 2-3 minutes to download all dependencies.

---

## Step 3: Start the BirdNET Server

### 3.1 Start Docker BirdNET Container
In your terminal:
```bash
docker run -d -p 8080:80 benjaminloeffel/birdnet-inference-api
```

**What this does:** Downloads and runs the BirdNET AI model (about 500 MB download on first run).

**Verify it's running:**
```bash
docker ps
```
You should see a container named something like `peaceful_darwin` or similar.

**Test the server:**
Open your browser and visit: http://localhost:8080

You should see the BirdNET API documentation page.

---

## Step 4: Create ngrok Tunnel

### 4.1 Start ngrok
In a **new terminal window** (keep the first one open):
```bash
ngrok http 8080
```

### 4.2 Get Your ngrok URL
In the ngrok terminal, you'll see output like:
```
Forwarding   https://abc-123-xyz.ngrok-free.dev -> http://localhost:8080
```

**Copy the HTTPS URL** (the part that looks like `https://abc-123-xyz.ngrok-free.dev`)

⚠️ **IMPORTANT**: This URL changes every time you restart ngrok! Keep this terminal window open.

---

## Step 5: Configure the App

### 5.1 Update Environment Variables
In the project folder, open the `.env` file in a text editor.

You should see:
```
EXPO_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

EXPO_PUBLIC_BIRDNET_SERVER_URL=https://xxx.ngrok-free.dev
```

**Replace the last line** with your ngrok URL from Step 4.2:
```
EXPO_PUBLIC_BIRDNET_SERVER_URL=https://abc-123-xyz.ngrok-free.dev
```

**Save the file.**

---

## Step 6: Start the Mobile App

### 6.1 Start Development Server
In a **third terminal window**:
```bash
npm run dev
```

After a few seconds, you'll see a QR code in the terminal.

### 6.2 Connect Your Phone

**Make sure:**
- Your phone is on the **same WiFi network** as your computer
- Bluetooth is enabled (for some network discovery features)

**Scan the QR code:**
- **iOS**: Open the Camera app, point at the QR code, tap the notification
- **Android**: Open Expo Go app, tap "Scan QR Code"

The app should load on your phone within 10-30 seconds.

---

## Step 7: Test the App

### 7.1 Grant Permissions
When the app opens, it will request:
- **Microphone access** - Required for audio capture
- **Location access** - Required for GPS tagging

Tap "Allow" for both.

### 7.2 Verify Connection
Before testing, verify the BirdNET server is reachable:
1. Open your phone's web browser
2. Visit your ngrok URL (from Step 4.2)
3. You should see the BirdNET API documentation

If this doesn't work:
- Check your phone is on the same WiFi as your computer
- Check ngrok is still running
- Try restarting ngrok and updating `.env` again

### 7.3 Start Monitoring
1. Open the app (should be on the "Monitor" tab)
2. Tap the **"Start Monitoring"** button
3. Watch the statistics:
   - "Segments Analyzed" should increment every 5 seconds
   - "Current Confidence" will show detection scores

### 7.4 Test Detection
To test Swift Parrot detection:
1. Go to YouTube and search for "Swift Parrot call"
2. Or visit: https://xeno-canto.org/species/Lathamus-discolor
3. Play a Swift Parrot recording near your phone
4. Watch the confidence score increase
5. If confidence reaches 90% (default threshold), it will save to "Detections" tab

**Tip:** You can lower the threshold in the Settings tab to make detection easier for testing.

---

## Troubleshooting

### "BirdNET server unreachable"

**Check these in order:**

1. **Is Docker running?**
   ```bash
   docker ps
   ```
   Should show the BirdNET container.

2. **Is ngrok running?**
   Check the ngrok terminal window - should show active connections.

3. **Is the .env file correct?**
   Open `.env` and verify the `EXPO_PUBLIC_BIRDNET_SERVER_URL` matches your ngrok URL.

4. **Did you restart the app?**
   - Force quit Expo Go completely
   - Reopen and scan QR code again

5. **Same WiFi network?**
   - Verify phone and computer are on the same network
   - Try turning phone WiFi off and on
   - Some public/corporate WiFi blocks peer-to-peer connections

6. **Test ngrok in phone browser:**
   - Open Safari/Chrome on your phone
   - Visit the ngrok URL
   - Should see BirdNET API docs

### "Monitoring stops automatically"

This is normal after 5 consecutive API errors. Check the error message and fix the issue, then tap "Start Monitoring" again.

### "No detections appearing"

- Default threshold is 90% (very high for testing)
- Lower threshold in Settings tab to 50-70%
- Play known Swift Parrot recording
- Check the "Current Confidence" value updates

### "QR code won't scan"

- Make sure phone and computer are on same WiFi
- Try typing the URL manually (shown under QR code)
- Check firewall isn't blocking connections

---

## When You're Done Testing

### Stop All Services

1. **Stop the mobile app**: Close Expo Go
2. **Stop the dev server**: Press `Ctrl+C` in the terminal running `npm run dev`
3. **Stop ngrok**: Press `Ctrl+C` in the ngrok terminal
4. **Stop Docker** (optional):
   ```bash
   docker stop $(docker ps -q)
   ```

### If You Restart Later

⚠️ **CRITICAL**: The ngrok URL changes every time!

When you restart:
1. Start Docker: `docker start $(docker ps -a -q)`
2. Start ngrok: `ngrok http 8080`
3. **Copy the NEW ngrok URL** (it will be different!)
4. **Update `.env`** with the new URL
5. Start dev server: `npm run dev`
6. **Force quit and restart the mobile app**

---

## Expected Behavior

### Normal Operation
- Segments analyzed every 5 seconds
- Confidence scores between 0.0-1.0 (0-100%)
- Most background noise scores < 0.2 (20%)
- Swift Parrot calls should score > 0.8 (80%)
- Detections appear in "Detections" tab immediately
- GPS coordinates captured with each detection

### Performance
- Each analysis takes 1-3 seconds
- Battery drain is high (continuous audio capture + GPS)
- Network data: ~10 KB per analysis (5 seconds of audio)
- Storage: ~50-100 KB per saved detection

---

## Data Collection Notes

### What Gets Saved
- **Only high-confidence Swift Parrot detections** (≥ threshold)
- Audio file (.webm format)
- GPS coordinates
- Timestamp
- Confidence score
- Device ID (auto-generated)

### What Doesn't Get Saved
- Low-confidence detections (below threshold)
- Background noise
- Non-Swift Parrot bird calls
- Your personal information

### Database
All data is stored in a shared Supabase database. Other testers may see your detections in the database, but with only:
- Anonymous device ID
- GPS coordinates (general area)
- Timestamp and confidence
- Audio recording

---

## Providing Feedback

When reporting issues or feedback, please include:

1. **Your setup:**
   - Phone model and OS version
   - Computer OS (Windows/Mac/Linux)
   - WiFi type (home/public/corporate)

2. **Screenshots:**
   - The Monitor tab showing statistics
   - Any error messages
   - Settings tab showing your configuration

3. **Console logs:**
   - From the `npm run dev` terminal
   - From ngrok terminal (if relevant)

4. **What you were doing:**
   - Step-by-step what you did before the issue
   - What you expected to happen
   - What actually happened

---

## Questions?

**Common Questions:**

**Q: Can I test without being on the same WiFi?**
A: Not with the current setup. The POC requires local network access. A production version would have cloud-hosted BirdNET.

**Q: Can I test on the web browser?**
A: No, this is a mobile-only app requiring microphone and GPS access.

**Q: Why does ngrok URL keep changing?**
A: Free ngrok tier generates new URLs on each restart. Paid ngrok has permanent URLs.

**Q: How much data does it use?**
A: About 10 KB per 5-second analysis, or ~1.2 MB per 10 minutes of monitoring.

**Q: Will this work in the field?**
A: Not yet - it requires WiFi connection to your laptop. Production version would need cloud-hosted BirdNET or on-device ML.

**Q: Can I contribute improvements?**
A: Contact the developer about the contribution process and roadmap.

---

## Technical Support

If you encounter issues not covered here:
1. Check the main README.md for additional troubleshooting
2. Review CURRENT_STATUS.md for known limitations
3. Contact the developer with detailed error information

---

## Acknowledgments

Thank you for testing this proof of concept! Your feedback helps improve the system for field deployment with real Swift Parrot conservation efforts.

**BirdNET Model:** Cornell Lab of Ornithology & Chemnitz University of Technology
**Species:** Swift Parrot (*Lathamus discolor*) - Critically Endangered
