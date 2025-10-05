# Testing Your BirdNET Connection

## What Was Fixed

1. **Added the ngrok URL to `.env`**:
   ```
   EXPO_PUBLIC_BIRDNET_SERVER_URL=https://pruinose-alise-uncooled.ngrok-free.dev
   ```

2. **Fixed the API field name**: Changed from `'audio'` to `'file'` to match BirdNET API spec

3. **Fixed response parsing**: The BirdNET server returns:
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

4. **Swift Parrot detection**: The code now specifically looks for species names containing "swift" or "lathamus"

## Testing Steps

### 1. Restart Your Mobile App

**IMPORTANT**: You MUST completely restart the app for the new `.env` to take effect:

1. **Force quit** the Expo Go app (swipe up and close it)
2. **Reopen** Expo Go
3. **Scan the QR code** again to reload the app

### 2. Start Monitoring

1. Open the app
2. Tap **"Start Monitoring"**
3. Allow microphone permissions if prompted
4. Watch your ngrok console - you should see POST requests to `/inference/`

### 3. What Should Happen

When the app captures 5-second audio segments:

**On your ngrok console**, you'll see:
```
POST /inference/ 200 OK
```

**In the app**:
- "Segments Analyzed" counter increments
- If BirdNET detects a Swift Parrot with confidence > 0.9, "Detections" increments
- Location and timestamp are recorded
- High-confidence detections are saved to Supabase

### 4. Check Detections

1. Tap the **"Detections"** tab
2. You'll see all recorded Swift Parrot detections with:
   - Confidence score
   - Timestamp
   - GPS coordinates
   - Device ID

### 5. Troubleshooting

**If you still see "BirdNET server unreachable":**

1. Verify ngrok is still running in PowerShell
2. Test the URL in mobile browser: `https://pruinose-alise-uncooled.ngrok-free.dev`
3. Check that both devices are on the same WiFi
4. Make sure you completely restarted the mobile app

**If detections aren't appearing:**

1. The threshold is set to 0.9 (90% confidence)
2. You can lower it in Settings tab
3. Check the Supabase database at: https://0ec90b57d6e95fcbda19832f.supabase.co

## How It Works Now

```
Mobile App (your phone)
    ↓ Captures 5-second audio segments
    ↓ Sends to: https://pruinose-alise-uncooled.ngrok-free.dev/inference/
    ↓
ngrok (on your laptop)
    ↓ Forwards to localhost:8080
    ↓
Docker BirdNET (on your laptop)
    ↓ Analyzes audio with BirdNET neural network
    ↓ Returns species predictions with confidence scores
    ↓
Mobile App
    ↓ If Swift Parrot confidence >= 0.9
    ↓ Saves audio + metadata to Supabase
    ↓ Displays in Detections tab
```

## Expected Behavior

- **Continuous monitoring**: Captures audio every 5 seconds
- **Only uploads detections**: Saves bandwidth by only uploading high-confidence Swift Parrot calls
- **Geolocation**: Each detection includes GPS coordinates
- **Offline capable**: If Supabase is unreachable, detections are queued and uploaded later

## Play a Swift Parrot Call

To test detection, play a Swift Parrot call recording near your phone:
- YouTube: Search "Swift Parrot call"
- Xeno-canto: https://xeno-canto.org/species/Lathamus-discolor

The app should detect it within 5-10 seconds if the confidence is high enough!
