Session Notes - Oct 6, 2025 (Afternoon Session)
🎯 Mission: Get M4A→WAV Conversion Working

✅ What Got Done
1. Confirmed Edge Function Limitation (FAILED APPROACH)

Problem: Supabase Edge Functions cannot convert M4A→WAV
Why: Deno sandbox blocks:

Web Workers (kills ffmpeg.wasm)
Subprocess spawning (Deno.Command blocked)
Binary execution (no system ffmpeg)


Error: "Spawning subprocesses is not allowed on Supabase Edge Runtime"
Decision: Abandoned Edge Function conversion approach

2. Attempted Railway Proxy Server (FAILED APPROACH)

Created: Node.js proxy server with Express + fluent-ffmpeg
Deployed to: Railway (attempted)
Problem: Railway's Railpack build system refused to install ffmpeg
Attempts made:

Created nixpacks.toml with ffmpeg package
Created Dockerfile with apt-get ffmpeg install
Railway kept ignoring configs and using Railpack


Error: "Cannot find ffmpeg" - persisted through 4+ deploy attempts
Decision: Abandoned Railway, switched to local proxy

3. Successfully Deployed Local Proxy Server (WORKING ✅)

Location: C:\AI\biosys_swift\birdnet-proxy\
Stack: Node.js + Express + fluent-ffmpeg + multer + axios
Runs on: localhost:3000
Exposed via: ngrok → https://pruinose-alise-uncooled.ngrok-free.dev
Flow: App → ngrok → Proxy (converts M4A→WAV) → BirdNET (localhost:8080) → Results

4. Fixed BirdNET API Integration (WORKING ✅)
Issue 1: Wrong field name

BirdNET expects file not audio
Changed: formData.append('audio', ...) → formData.append('file', ...)

Issue 2: Missing parameters

BirdNET requires lat/lon coordinates
Added:

javascript  formData.append('lat', '-42.88');
  formData.append('lon', '147.33');
Issue 3: Wrong FormData implementation

Browser FormData doesn't work in Node.js
Fixed with form-data package:

javascript  const FormData = require('form-data');
  formData.append('file', fs.createReadStream(outputPath), {
    filename: 'audio.wav',
    contentType: 'audio/wav'
  });
5. Fixed Response Parsing (WORKING ✅)
Problem: App expected flat array, BirdNET returns nested object
json{
  "predictions": [
    {
      "start_time": 0,
      "stop_time": 3,
      "species": [
        {"species_name": "...", "probability": 0.91}
      ]
    }
  ]
}
Solution: Extract and flatten species from all time segments
typescriptconst predictionsList = predictions.predictions || [];
const allSpecies = predictionsList.flatMap(segment => segment.species || []);
6. 🎉 SUCCESSFUL DETECTION (WORKING ✅)

Swift Parrot detected at 91.6% confidence!
Full chain working:

✅ M4A recording (82KB files)
✅ Upload to proxy via ngrok
✅ Proxy converts M4A→WAV using ffmpeg
✅ Proxy sends WAV to BirdNET
✅ BirdNET analyzes and returns predictions
✅ App parses response correctly
✅ Swift Parrot detection logic works




❌ What's Still Broken
Supabase Save Error
Error: TypeError: Network request failed after successful detection
When: Trying to save detection result to Supabase database
Impact: Detection works, but result isn't saved to database/storage
Status: Not debugged yet - deferred to next session

📊 Current Infrastructure
Running Services

Docker BirdNET: localhost:8080 (must stay running)
Local Proxy: localhost:3000 (must run during dev)
ngrok: https://pruinose-alise-uncooled.ngrok-free.dev → localhost:3000
Expo Dev Server: Running in /git folder

File Structure
C:\AI\biosys_swift\
├── git\                          # Main app
│   └── services\
│       └── detectionModelBirdNET.ts  # MODIFIED - ready to commit
└── birdnet-proxy\                # Local proxy server
    ├── index.js                  # Main proxy code
    ├── package.json
    └── uploads\                  # Temp storage for conversions

🔧 How It Works Now
Complete Flow:
1. Android phone records M4A (5 seconds, ~82KB)
2. App uploads M4A to ngrok URL
3. ngrok tunnels to local proxy (localhost:3000)
4. Proxy receives M4A, converts to WAV using ffmpeg
5. Proxy sends WAV to BirdNET (localhost:8080)
6. BirdNET analyzes, returns predictions
7. Proxy returns predictions to app
8. App parses, detects Swift Parrot
9. ❌ App tries to save to Supabase (FAILS HERE)

📝 Code Changes Made
services/detectionModelBirdNET.ts

Changed proxy URL from Railway to ngrok
Fixed response parsing to handle nested predictions structure
Added debug logging for response format
Updated comments to reflect "Local Proxy" instead of "Railway Proxy"

birdnet-proxy/index.js (new file)

Created Express server with multer for file uploads
Integrated fluent-ffmpeg for M4A→WAV conversion
Fixed FormData to use Node.js form-data package
Added lat/lon parameters for BirdNET API
Changed field name from audio to file


🚀 Starting Development Session
To resume work, run these in order:
Terminal 1: Docker BirdNET
powershelldocker ps  # Check if running
# If not running: docker start [container-id]
Terminal 2: Local Proxy
powershellcd C:\AI\biosys_swift\birdnet-proxy
npm start
# Should show: "BirdNET Proxy running on port 3000"
Terminal 3: ngrok
powershellngrok http 3000
# Note the HTTPS URL (should be https://pruinose-alise-uncooled.ngrok-free.dev)
# If URL changed, update detectionModelBirdNET.ts line ~127
Terminal 4: Expo
powershellcd C:\AI\biosys_swift\git
npx expo start --clear

📋 Next Session To-Do
Immediate (Before Coding)

Commit working code:

powershell   git add services/detectionModelBirdNET.ts
   git commit -m "feat: working M4A to WAV conversion via local proxy"
   git push origin main

Create session notes file (this document)

High Priority

Debug Supabase save error

Add logging to see where save fails
Check Supabase credentials
Verify network connectivity after detection


Test threshold adjustment

Currently 0.9 threshold
Swift Parrot detected at 0.916 (barely above)
Consider lowering to 0.85 for more detections



Medium Priority

Add proxy to Git repository

Create new repo for birdnet-proxy OR
Add as subfolder to main repo
Document deployment for production


Production deployment planning

Can't run ngrok in production
Options:

Deploy proxy to VPS (DigitalOcean/Render/Fly.io)
Use permanent domain instead of ngrok
OR: Find working Railway/cloud solution





Low Priority

Remove debug logging

Clean up verbose console.logs once stable
Keep error logging


Update Error Diagnostic Guide

Add section on local proxy setup
Document ngrok configuration
Add Railway failure notes




🎓 Lessons Learned
What Worked

Local proxy with ngrok = fast, reliable, full control
Testing direct to BirdNET API (curl) to understand expected format
Incremental debugging with targeted console.logs
Committing frequently to save progress

What Didn't Work

Supabase Edge Functions (too sandboxed)
Railway automatic deployments (ignored config)
Trying to use browser APIs in Node.js (FormData/Blob)

Best Practices Established

Always test infrastructure components independently first
Use ngrok for local development before deploying cloud
Check actual API response format with simple tools before building complex integrations


🔗 Important URLs & Credentials

ngrok tunnel: https://pruinose-alise-uncooled.ngrok-free.dev
GitHub repo: https://github.com/Awesomnian/biosys_swift
Supabase project: phayiovbyaaqimlshmxo
BirdNET local: http://localhost:8080
Proxy local: http://localhost:3000


⚠️ Known Issues

Network request failed after successful detection - needs investigation
ngrok URL temporary - will change if ngrok restarts
No production deployment - currently development-only setup
Threshold might be too high - 0.9 may miss valid detections


📊 Detection Results Sample
Lathamus discolor_Swift Parrot: 91.6% ✅ DETECTED
Lathamus discolor_Swift Parrot: 89.8% ❌ Below threshold (0.9)
Lathamus discolor_Swift Parrot: 33.9% ❌ Below threshold
Recommendation: Consider lowering threshold to 0.85

Session End Time: Ready to commit
Status: Detection chain fully functional, save to database pending debug
Commit Hash: Pending (next action)