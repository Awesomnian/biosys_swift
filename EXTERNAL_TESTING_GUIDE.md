# BioSys: Swift - External Testing Guide

**For Remote Testers Using Developer's Server**

This guide explains how to install and test the Swift Parrot bioacoustic monitoring app on your device using the developer's BirdNET server.

---

## Overview

You will test the app by connecting to the developer's publicly accessible BirdNET server through ngrok. You only need to install the mobile app - all server infrastructure is already running.

**What You'll Need:**
- A smartphone (iOS or Android)
- WiFi or mobile data connection
- About 5 minutes for setup

---

## Step 1: Install Expo Go

### iOS
1. Open the App Store
2. Search for "Expo Go"
3. Install the app
4. Open Expo Go

**Direct link:** https://apps.apple.com/app/expo-go/id982107779

### Android
1. Open Google Play Store
2. Search for "Expo Go"
3. Install the app
4. Open Expo Go

**Direct link:** https://play.google.com/store/apps/details?id=host.exp.exponent

---

## Step 2: Connect to the App

The developer will provide you with either:
- **QR Code** - Scan with your phone
- **URL Link** - Tap to open in Expo Go

### iOS - Scanning QR Code
1. Open the Camera app
2. Point at the QR code
3. Tap the notification that appears
4. App will open in Expo Go

### Android - Scanning QR Code
1. Open Expo Go app
2. Tap "Scan QR Code"
3. Point at the QR code
4. App will load

### Using a Link
1. Tap the link provided by developer
2. Choose "Open in Expo Go"
3. App will load

The app should load within 10-30 seconds.

---

## Step 3: Grant Permissions

When the app opens, it will request two permissions:

### Microphone Access
- **Purpose:** Record audio for bird call detection
- **Required:** Yes
- **Action:** Tap "Allow"

### Location Access
- **Purpose:** Tag detections with GPS coordinates
- **Recommended:** Yes (but optional for testing)
- **Action:** Tap "Allow" or "Allow While Using App"

If you deny permissions by accident:
- **iOS:** Settings > Expo Go > Enable Microphone & Location
- **Android:** Settings > Apps > Expo Go > Permissions > Enable Microphone & Location

---

## Step 4: Using the App

The app has three tabs at the bottom:

### Monitor Tab (Main Screen)

This is where you start and stop monitoring.

**What you'll see:**
- "Start Monitoring" button
- Statistics section (segments analyzed, current confidence, detection count)
- Status message area

**To start testing:**
1. Tap "Start Monitoring"
2. Watch the statistics update
3. "Segments Analyzed" increments every 5 seconds
4. "Current Confidence" shows latest detection score (0.0-1.0)

**Normal behavior:**
- Background noise typically scores 0.0-0.2 (0-20%)
- Each segment takes 1-3 seconds to analyze
- Counter increments continuously while monitoring

**To stop:**
1. Tap "Stop Monitoring"
2. Statistics will freeze at current values

### Detections Tab

Shows all saved Swift Parrot detections.

**What you'll see:**
- List of detections (if any)
- Each entry shows:
  - Confidence score (e.g., "Confidence: 0.92")
  - Timestamp (when detected)
  - Location (GPS coordinates if enabled)

**Empty state:**
- "No detections yet"
- This is normal until you trigger a detection

### Settings Tab

Configure detection threshold and GPS settings.

**Detection Threshold:**
- Default: 0.90 (90%)
- Purpose: Minimum confidence to save a detection
- Lower values = more detections (good for testing)
- Higher values = only very confident detections

**Location Tracking:**
- Toggle on/off
- Shows current GPS coordinates when enabled
- Updates approximately every second

---

## Step 5: Testing Detection

### Method 1: Using YouTube (Recommended)

1. On a second device (laptop, tablet, another phone):
2. Open YouTube
3. Search: "Swift Parrot call"
4. Recommended video: https://www.youtube.com/results?search_query=swift+parrot+call
5. Play the video near your testing phone
6. Watch the "Current Confidence" increase
7. If it reaches your threshold (default 90%), it saves to Detections tab

### Method 2: Using Xeno-Canto

1. On a second device, visit: https://xeno-canto.org/species/Lathamus-discolor
2. Click any recording to play
3. Play it near your testing phone
4. Watch confidence scores

### Method 3: Lower the Threshold (Easier Testing)

If you don't have access to real Swift Parrot calls:

1. Go to Settings tab
2. Drag "Detection Threshold" slider to 0.50 (50%)
3. Go back to Monitor tab
4. Start monitoring
5. Play ANY bird call video from YouTube
6. Most bird species will score above 50%
7. Check Detections tab for results

**Note:** The system is specifically trained to detect Swift Parrots, but will identify other species too. Only Swift Parrot detections above threshold are considered "positive" for conservation purposes.

---

## What's Happening Behind the Scenes

### Your Phone
1. Records 5-second audio segments continuously
2. Sends each segment to the BirdNET server
3. Receives analysis results
4. Displays confidence scores
5. Saves high-confidence Swift Parrot detections

### Developer's Server (You Don't See This)
1. Receives audio file
2. Runs BirdNET AI model for species identification
3. Returns predictions with confidence scores
4. Processes hundreds of bird species

### Database
- Only detections above threshold are saved
- Stored in Supabase cloud database
- Includes: audio file, GPS, timestamp, confidence
- Data is anonymous (device ID only)

---

## Expected Behavior

### Normal Operation
- Segments analyzed counter increments every 5 seconds
- Confidence scores range from 0.0 to 1.0 (0% to 100%)
- Most background noise scores < 0.2 (20%)
- Swift Parrot calls should score > 0.8 (80%)
- Detection analysis takes 1-3 seconds per segment

### When Monitoring Stops Automatically
The app has built-in error protection:
- **Stops after 5 consecutive errors**
- This prevents battery drain if something goes wrong
- You'll see: "Too many consecutive errors, stopping monitoring"

**If this happens:**
1. Check your internet connection
2. Check the error message in app
3. Contact the developer with details
4. Try "Start Monitoring" again

### Performance
- **Battery drain:** High (continuous recording + GPS + network)
- **Data usage:** ~10 KB per analysis (~1.2 MB per 10 minutes)
- **Network required:** Yes, must have internet connection
- **Works offline:** No (requires server connection)

---

## Troubleshooting

### App Won't Load
- **Check internet connection** - Try loading a website
- **Verify link/QR code** - Ask developer for fresh one
- **Reinstall Expo Go** - Delete and reinstall from app store
- **Check phone date/time** - Must be set correctly

### Can't Start Monitoring
- **"Microphone permission required"**
  - Go to phone Settings > Expo Go > Enable Microphone
  - Restart Expo Go app

- **"BirdNET server unreachable"**
  - Developer's server may be offline
  - Check your internet connection
  - Contact developer to verify server status

- **App crashes immediately**
  - Force quit Expo Go completely
  - Reopen and scan QR code again
  - Try different WiFi network if available

### No Sound Recording
- **Remove phone case** if it blocks microphone
- **Check microphone isn't covered**
- **Speak into phone** - confidence should respond
- **Try airplane mode off** - some phones disable mic in airplane mode

### Confidence Always Shows 0.0
- **Not actually recording**
  - Check microphone permission
  - Restart monitoring

- **Very quiet environment**
  - Normal! Silence scores near zero
  - Play a sound/music to test

- **Server not responding**
  - Contact developer
  - Check error messages in app

### No Detections Saving
- **Confidence below threshold**
  - Lower threshold in Settings tab
  - Try threshold of 0.50 for testing

- **No Swift Parrot calls detected**
  - Normal! Most sounds aren't Swift Parrots
  - Try playing Swift Parrot recording from YouTube

- **Not starting monitoring properly**
  - Verify "Monitoring" shows in status
  - Check segments analyzed is incrementing

### Location Not Working
- **GPS permission denied**
  - Settings > Expo Go > Location > While Using App

- **Indoor testing**
  - GPS doesn't work well indoors
  - Move near window or go outside

- **Can still test without GPS**
  - Location is optional
  - Detections will save without coordinates

---

## Data Privacy

### What Gets Collected
- **Audio recordings** - Only segments with high confidence Swift Parrot detections
- **GPS coordinates** - If you enabled location permission
- **Timestamps** - When detection occurred
- **Confidence scores** - How confident the AI is
- **Anonymous device ID** - Random ID (not linked to you)

### What Doesn't Get Collected
- Your name, email, or personal information
- Low-confidence detections or background noise
- Continuous audio (only 5-second segments above threshold)
- Your phone's unique identifiers

### Who Can See Your Data
- The developer (for this research project)
- Other project researchers
- Data is shared for Swift Parrot conservation research
- Audio files and GPS coordinates are stored in cloud database

### Your Rights
- You can request deletion of your data
- You can stop testing anytime (just close the app)
- Participation is voluntary

---

## Providing Feedback

When reporting issues or feedback, please include:

### Essential Information
1. **Phone model and OS**
   - Example: "iPhone 13, iOS 17.2" or "Samsung Galaxy S21, Android 13"

2. **What you were doing**
   - Step-by-step actions before the issue
   - Example: "Started monitoring, waited 30 seconds, then app crashed"

3. **What you expected**
   - Example: "Thought confidence would be higher for bird call"

4. **What actually happened**
   - Example: "App stopped with error message"

### Helpful Extras (Optional)
- **Screenshots** of error messages or unexpected behavior
- **Time of testing** - Helps developer check server logs
- **Internet connection type** - WiFi or mobile data
- **Approximate location** - Helps with GPS troubleshooting

### How to Send Feedback
Contact the developer using the method they provided (email, message, etc.)

---

## Frequently Asked Questions

**Q: Do I need to create an account?**
A: No, the app works without any login or account.

**Q: Does this work offline?**
A: No, it requires internet connection to send audio to the BirdNET server.

**Q: Will this drain my battery?**
A: Yes, continuous audio recording, GPS, and network usage will drain battery faster than normal.

**Q: How much mobile data does it use?**
A: About 10 KB per 5-second analysis, or roughly 1.2 MB per 10 minutes of monitoring.

**Q: Can I test this on WiFi?**
A: Yes! WiFi is actually preferred and won't count against your data plan.

**Q: What if I hear a real Swift Parrot in the wild?**
A: Amazing! Start monitoring immediately and let it record. The system is designed for exactly this scenario. Make sure you're in an area with cellular/WiFi coverage.

**Q: Why does monitoring stop automatically sometimes?**
A: The app stops after 5 consecutive errors to prevent battery drain. This usually means connectivity issues or server problems. Contact the developer if this happens frequently.

**Q: Can I use this for other bird species?**
A: The BirdNET model recognizes over 3,000 bird species worldwide. However, this app is specifically designed to save only Swift Parrot detections above the threshold. Other species will show in confidence scores but won't save (unless you lower the threshold significantly).

**Q: Is this app available in the App Store / Play Store?**
A: No, this is a proof-of-concept for research only. It's distributed through Expo Go for testing purposes.

**Q: Can I install this permanently on my phone?**
A: Not through Expo Go (it requires the developer server). A production version would need to be built and published to app stores.

**Q: Why is the confidence score always low?**
A: This is normal! Most environmental sounds (wind, traffic, human speech) score very low. Bird calls score higher, and Swift Parrot calls specifically should score above 0.8 (80%).

**Q: What happens to the recordings?**
A: Only recordings above your threshold are saved to the cloud database. They're used for research and conservation of Swift Parrots. Low-confidence recordings are discarded immediately.

---

## Acknowledgments

Thank you for helping test this proof of concept! Your feedback directly supports Swift Parrot conservation research.

### Swift Parrot Conservation Status
- **Scientific name:** *Lathamus discolor*
- **Conservation status:** Critically Endangered (IUCN Red List)
- **Population:** Estimated 750-1,500 breeding pairs remaining
- **Habitat:** Tasmania and mainland Australia (seasonal)
- **Threats:** Habitat loss, sugar glider predation, climate change

Your testing helps validate technology that could be deployed in the field to monitor Swift Parrot populations more effectively.

### Technology Credits
- **BirdNET:** Cornell Lab of Ornithology & Chemnitz University of Technology
- **Database:** Supabase
- **Mobile Framework:** Expo / React Native
- **Tunnel:** ngrok

---

## Support

If you experience issues not covered in this guide, please contact the developer with:
- Description of the problem
- Phone model and OS version
- Screenshots (if applicable)
- Time when issue occurred

The developer can then check server logs and help diagnose the issue.

---

**Happy Testing!**

Every test session helps improve the system for real-world Swift Parrot conservation.
