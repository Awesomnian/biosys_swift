# BirdNET Quick Start (Updated 2025)

## The Problem You Hit

The old BirdNET installation instructions don't work because:
- ❌ No `requirements.txt` file exists
- ❌ No `server.py` file exists
- ✅ BirdNET team restructured the project in 2024-2025

## The Solution: Use Docker

### Step 1: Install Docker

**Windows:**
- Download: https://www.docker.com/products/docker-desktop/
- Install Docker Desktop
- Start Docker Desktop

**Mac:**
- Download: https://www.docker.com/products/docker-desktop/
- Install Docker Desktop
- Start Docker Desktop

**Linux:**
```bash
sudo apt update
sudo apt install docker.io
sudo systemctl start docker
```

### Step 2: Run BirdNET Server

Open PowerShell (Windows) or Terminal (Mac/Linux):

```bash
# Pull the Docker image
docker pull benjaminloeffel/birdnet-inference-api

# Run the server (container uses port 80, we map to 8080 on host)
docker run -p 8080:80 benjaminloeffel/birdnet-inference-api
```

You should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:80 (Press CTRL+C to quit)
```

**Note:** TensorFlow warnings about gradients are normal and can be ignored. They only affect training, not inference.

### Step 3: Test It Works

Open a new terminal/PowerShell window:

**Windows PowerShell:**
```powershell
# Use curl.exe (not PowerShell's curl alias)
curl.exe http://localhost:8080/health

# Or use Invoke-WebRequest
Invoke-WebRequest -Uri http://localhost:8080/health

# Or open in browser
start http://localhost:8080/health
```

**Mac/Linux:**
```bash
curl http://localhost:8080/health
```

If you see a response (JSON or page loads), it's working! ✅

### Step 4: Update Your App Code

Edit `services/sensorService.ts`, find the `initialize()` method around line 54:

**Replace this:**
```typescript
this.detectionModel = await ModelFactory.autoDetectAndCreate(
  this.config.detectionThreshold
);
```

**With this:**
```typescript
this.detectionModel = await ModelFactory.createBirdNETModel(
  this.config.detectionThreshold
);
```

### Step 5: Run Your App

```bash
npm run dev
```

Open the app in your browser, go to Home tab, click "Start Monitoring".

### Step 6: Test Detection

1. Go to https://xeno-canto.org/753251
2. Download a Swift Parrot recording
3. Play it near your microphone
4. Check browser console for detection logs
5. Go to Detections tab to see results

---

## That's It!

The BirdNET server will keep running in Docker. To stop it:
- Press `Ctrl+C` in the terminal where it's running
- Or: `docker ps` to find container ID, then `docker stop <id>`

To start it again:
```bash
docker run -p 8080:80 benjaminloeffel/birdnet-inference-api
```

---

## Troubleshooting

### Docker not installed
**Error:** `docker: command not found`
**Fix:** Install Docker Desktop from https://www.docker.com/

### Port already in use
**Error:** `port is already allocated`
**Fix:** Change to different port:
```bash
docker run -p 8081:80 benjaminloeffel/birdnet-inference-api
```
Then update your edge function to use port 8081.

### PowerShell curl error
**Error:** `The underlying connection was closed`
**Fix:** Use `curl.exe` instead of `curl`:
```powershell
curl.exe http://localhost:8080/health
```
PowerShell's `curl` is an alias that behaves differently.

### TensorFlow warnings
**Warning:** `WARNING:absl:Importing a function...with unsaved custom gradients`
**Fix:** These are normal and safe to ignore. They don't affect the server.

### Can't access localhost:8080
**Error:** Edge function can't reach BirdNET
**Fix:**
- For local dev: Edge functions run in cloud, can't access localhost
- Either: Run BirdNET in cloud (see Production in docs/BIRDNET_SETUP.md)
- Or: Test with mock model first, deploy BirdNET to Railway ($5/mo)

### Python errors about birdnet_analyzer
**You don't need Python!** That's the old method. Just use Docker.

---

## Why Docker?

- ✅ No Python version conflicts
- ✅ No dependency issues
- ✅ Works exactly the same on Windows/Mac/Linux
- ✅ Isolated from your system
- ✅ Easy to start/stop/update

---

## Next Steps

- Deploy to production: See `docs/BIRDNET_SETUP.md` section "Production Deployment"
- Adjust detection threshold: In Settings tab of your app
- Train custom model: See `docs/MODEL_REQUIREMENTS.md`

---

## Full Documentation

- **Complete BirdNET Guide**: `docs/BIRDNET_SETUP.md`
- **Model Comparison**: `docs/MODEL_COMPARISON.md`
- **Code Examples**: `docs/USAGE_EXAMPLE.md`
- **All Models Overview**: `docs/README_MODELS.md`
