# BirdNET Integration Guide

> **⚠️ IMPORTANT UPDATE (January 2025):**
> The BirdNET-Analyzer repository has been restructured. The old installation method with `requirements.txt` and `server.py` no longer exists.
> **Use Docker instead** (see Quick Start below) or check the [official documentation](https://birdnet-team.github.io/BirdNET-Analyzer/).

## TL;DR - Quick Commands

**Run BirdNET server locally (easiest):**
```bash
docker pull benjaminloeffel/birdnet-inference-api
docker run -p 8080:80 benjaminloeffel/birdnet-inference-api
```

**Test it works:**
```bash
# Server should be running on http://localhost:8080
curl http://localhost:8080/health
```

That's it! Server is ready for your app.

---

This guide shows you how to integrate BirdNET's pre-trained bird sound recognition into your Swift Parrot Detection app.

## Overview

BirdNET is a research platform that uses deep learning to identify bird sounds. It's trained on 6,000+ species including Swift Parrots.

**Advantages:**
- No training required - works immediately
- Identifies all bird species, not just Swift Parrots
- High accuracy from extensive training data
- Community-supported and actively maintained

**Architecture:**
```
Your App (Audio Capture)
    ↓ (Audio Blob)
Supabase Edge Function
    ↓ (HTTP Request)
BirdNET Server
    ↓ (Species Detections)
Your App (Detection Results)
```

---

## Quick Start (Local Development)

**⚠️ Important Update (2025):** BirdNET-Analyzer has been restructured. The old `requirements.txt` and `server.py` method no longer exists.

### Step 1: Install BirdNET

**Option A: Using Docker (Recommended - Easiest)**

```bash
# Pull community-maintained BirdNET API server
docker pull benjaminloeffel/birdnet-inference-api

# Run on port 8080
docker run -p 8080:80 benjaminloeffel/birdnet-inference-api
```

**Option B: Using pip**

```bash
# Install BirdNET as a Python package
pip install birdnet

# Verify installation
python -m birdnet_analyzer.analyze --help
```

**Requires:** Python 3.10, 3.11, or 3.12

### Step 2: Start BirdNET Server

**⚠️ Server Status:** The official BirdNET API server is being reworked by the team.

**Current Working Solutions:**

**🐳 Docker Method (Recommended):**

```bash
# Run community BirdNET API
docker run -p 8080:80 benjaminloeffel/birdnet-inference-api

# Or use BirdNET-Go (alternative implementation with built-in API)
docker run -p 8080:80 ghcr.io/tphakala/birdnet-go:latest
```

**🐍 Python Method (May not have server mode yet):**

Check if server module is available:
```bash
python -m birdnet_analyzer --help
# Look for server-related commands
```

**Alternative: BirdNET-Go**

Download from: https://github.com/tphakala/birdnet-go
- Full-featured BirdNET implementation in Go
- Built-in web server and API
- Real-time analysis support

You should see:
```
Server listening on http://0.0.0.0:8080
```

### Step 3: Deploy Edge Function

The edge function is already created at `supabase/functions/analyze-birdcall/index.ts`.

Deploy it:

```bash
# If you haven't already, the function will be deployed automatically
# when you use it, or you can deploy manually via Supabase CLI
```

**Environment Variable (Optional):**

By default, the edge function looks for BirdNET at `http://localhost:8080`.

To use a different URL, set the environment variable:
- For local testing: The edge function will use `localhost:8080`
- For production: Set `BIRDNET_SERVER_URL` in your Supabase project settings

### Step 4: Use BirdNET Model in Your App

Update your sensor initialization to use BirdNET:

```typescript
// In app/(tabs)/index.tsx or wherever you initialize the sensor

import { ModelFactory } from '@/services/modelFactory';

// Option 1: Use BirdNET explicitly
const model = await ModelFactory.createBirdNETModel(0.9);

// Option 2: Manually specify in SensorService
const sensor = new SensorService(config, onStatsUpdate);
// Before calling initialize(), set the model type
sensor.detectionModel = await ModelFactory.createModel({
  type: 'birdnet',
  threshold: 0.9
});
await sensor.initialize();
```

### Step 5: Test

1. Start your app
2. Navigate to Home tab
3. Click "Start Monitoring"
4. Play a Swift Parrot recording from [Xeno-canto](https://xeno-canto.org/species/Lathamus-discolor)
5. Check browser console for:
   ```
   BirdNET analysis completed in 1234ms, confidence: 0.923
   Swift Parrot detected! Species: Swift Parrot
   ```

---

## Production Deployment

For production use, deploy BirdNET to a cloud server.

### Option 1: Railway with Docker (Easiest)

1. Create account at [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy Docker Image"
3. Enter: `benjaminloeffel/birdnet-inference-api`
4. Set port to 8080
5. Deploy
6. Copy the public URL (e.g., `https://your-app.railway.app`)

**Set environment variable in Supabase:**
- Go to your Supabase project → Settings → Edge Functions
- Add secret: `BIRDNET_SERVER_URL=https://your-app.railway.app`

**Cost:** ~$5/month on Hobby plan

### Option 2: Digital Ocean Droplet with Docker

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Install Docker
apt update
apt install docker.io

# Pull and run BirdNET container
docker pull benjaminloeffel/birdnet-inference-api
docker run -d -p 8080:80 --restart=always \
  --name birdnet benjaminloeffel/birdnet-inference-api

# Check status
docker ps
docker logs birdnet
```

**Cost:** $6-12/month depending on droplet size

### Option 3: Fly.io with Docker

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Create fly.toml
cat > fly.toml << EOF
app = "your-birdnet-app"

[http_service]
  internal_port = 8080
  force_https = true

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
EOF

# Deploy
fly launch --image benjaminloeffel/birdnet-inference-api
fly deploy
```

**Cost:** Free tier available, ~$3/month after

### Option 4: Using BirdNET-Go (Alternative)

BirdNET-Go is a Go implementation with excellent performance:

```bash
# Download latest release from:
# https://github.com/tphakala/birdnet-go/releases

# Run with Docker
docker run -d -p 8080:80 --restart=always \
  ghcr.io/tphakala/birdnet-go:latest
```

**Service file (for systemd):**
```ini
[Unit]
Description=BirdNET-Go Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/BirdNET-Analyzer
ExecStart=/usr/bin/python3 server.py --host 0.0.0.0 --port 8080
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable birdnet
sudo systemctl start birdnet

# Check status
sudo systemctl status birdnet
```

**Set environment variable:**
```
BIRDNET_SERVER_URL=http://your-droplet-ip:8080
```

### Option 3: AWS EC2 or Lightsail

Similar to Digital Ocean - launch instance, install Python, clone repo, run server.

Use security groups to allow inbound traffic on port 8080.

### Option 4: Docker (Any Provider)

Create `Dockerfile` in BirdNET-Analyzer directory:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python", "server.py", "--host", "0.0.0.0", "--port", "8080"]
```

Build and deploy:
```bash
docker build -t birdnet .
docker run -p 8080:80 birdnet
```

Deploy to Fly.io, Google Cloud Run, AWS ECS, etc.

---

## Configuration

### Adjust Detection Threshold

The default threshold is 0.9 (90% confidence). Adjust based on your needs:

```typescript
// Lower threshold = more detections, more false positives
const model = await ModelFactory.createBirdNETModel(0.7);

// Higher threshold = fewer detections, fewer false positives
const model = await ModelFactory.createBirdNETModel(0.95);
```

### Response Format

BirdNET returns all detected species. Your edge function extracts Swift Parrot:

```json
{
  "confidence": 0.923,
  "isPositive": true,
  "modelName": "BirdNET",
  "species": "Swift Parrot",
  "commonName": "Swift Parrot",
  "scientificName": "Lathamus discolor",
  "allDetections": [
    {
      "species": "Swift Parrot",
      "common_name": "Swift Parrot",
      "scientific_name": "Lathamus discolor",
      "confidence": 0.923
    },
    {
      "species": "Eastern Rosella",
      "common_name": "Eastern Rosella",
      "scientific_name": "Platycercus eximius",
      "confidence": 0.145
    }
  ]
}
```

### Target Other Species

Modify `supabase/functions/analyze-birdcall/index.ts`:

```typescript
// Add multiple target species
const targetSpecies = [
  "Lathamus discolor",      // Swift Parrot
  "Neophema chrysogaster",  // Orange-bellied Parrot
  "Pezoporus wallicus",     // Ground Parrot
];

const detection = results.find((result) =>
  targetSpecies.some((name) =>
    result.scientific_name?.includes(name) ||
    result.common_name?.toLowerCase().includes(name.toLowerCase())
  )
);
```

---

## Troubleshooting

### Edge Function Can't Reach BirdNET

**Error:** `BirdNET server returned 500` or timeout

**Solutions:**
1. Verify BirdNET server is running: `curl http://localhost:8080/health`
2. Check firewall allows connections on port 8080
3. Ensure `BIRDNET_SERVER_URL` is correctly set
4. For local dev, use `http://host.docker.internal:8080` if edge function runs in container

### No Detections for Swift Parrot

**Issue:** BirdNET returns results but no Swift Parrot

**Solutions:**
1. BirdNET may not have high confidence - check `allDetections` array
2. Audio quality may be poor - try cleaner recording
3. Swift Parrots may not be in audio - test with known recording from Xeno-canto
4. Lower threshold: `createBirdNETModel(0.7)`

### Slow Response Times

**Issue:** Takes >5 seconds per detection

**Solutions:**
1. BirdNET model is large - expect 1-3 second latency
2. Deploy BirdNET server closer to your users
3. Use smaller audio segments (3 seconds instead of 5)
4. Consider caching results for identical audio segments

### Memory Issues

**Issue:** BirdNET server crashes or uses too much RAM

**Solutions:**
1. Upgrade server to 2GB+ RAM
2. Process shorter audio segments
3. Restart BirdNET service periodically
4. Use Docker with memory limits: `docker run --memory=2g birdnet`

---

## API Reference

### Edge Function: `/functions/v1/analyze-birdcall`

**Request:**
```typescript
POST /functions/v1/analyze-birdcall
Headers:
  Authorization: Bearer YOUR_ANON_KEY
  Content-Type: multipart/form-data

Body:
  audio: Blob (audio file, .wav, .mp3, .webm, etc.)
```

**Response:**
```typescript
{
  confidence: number;        // 0.0 - 1.0
  isPositive: boolean;       // true if >= threshold
  modelName: "BirdNET";
  species?: string;
  commonName?: string;
  scientificName?: string;
  allDetections: Array<{
    species: string;
    common_name: string;
    scientific_name: string;
    confidence: number;
  }>;
}
```

---

## Switching Models

You can switch between model types without changing your app code:

```typescript
// Mock model (random detections)
const model = await ModelFactory.createModel({
  type: 'mock',
  threshold: 0.9
});

// TensorFlow.js model (custom trained)
const model = await ModelFactory.createModel({
  type: 'tensorflow',
  modelPath: '/models/swift-parrot/model.json',
  threshold: 0.9
});

// BirdNET model (pre-trained)
const model = await ModelFactory.createModel({
  type: 'birdnet',
  threshold: 0.9
});
```

All models implement the same interface:
- `initialize(): Promise<void>`
- `analyzeAudio(blob: Blob): Promise<DetectionResult>`
- `setThreshold(threshold: number): void`
- `getThreshold(): number`
- `getModelName(): string`

---

## Performance Comparison

| Model | Setup Time | Latency | Accuracy | Best For |
|-------|------------|---------|----------|----------|
| **Mock** | 0 min | <100ms | 0% | UI testing |
| **BirdNET** | 30 min | 1-3s | Excellent | Quick deployment |
| **TensorFlow.js** | 1-2 weeks | <500ms | Good* | Edge deployment |

*Depends on training data

---

## Cost Estimates

### Self-Hosted BirdNET

**Railway:**
- Hobby Plan: $5/month (500 hours)
- Good for low-volume testing

**Digital Ocean:**
- Basic Droplet: $6/month (1GB RAM)
- Upgrade to $12/month (2GB) recommended

**AWS Lightsail:**
- $5/month (512MB RAM)
- Upgrade to $10/month (1GB)

### API Services

BirdNET doesn't offer official paid API, but community alternatives exist:
- Check [BirdWeather](https://birdweather.com) for API access
- Look for regional acoustic monitoring services

---

## Testing Resources

### Swift Parrot Recordings

Download test audio from:
- [Xeno-canto](https://xeno-canto.org/species/Lathamus-discolor) - 100+ recordings
- [Macaulay Library](https://www.macaulaylibrary.org/) - Cornell's bird sounds
- [Australian Wildlife Sounds](https://wildambience.com/) - Professional recordings

### Test BirdNET Directly

```bash
# Analyze single file
python analyze.py --i /path/to/audio.wav --o results.txt --min_conf 0.7

# Check output
cat results.txt
```

---

## Next Steps

1. Test with real Swift Parrot recordings
2. Monitor false positive rate in Detections tab
3. Adjust threshold based on field performance
4. Consider hybrid approach: BirdNET for initial screening, custom TensorFlow model for confirmation

---

## Resources

- **BirdNET Repository**: https://github.com/birdnet-team/BirdNET-Analyzer
- **Research Paper**: "BirdNET: A deep learning solution for avian diversity monitoring"
- **Swift Parrot Conservation**: https://www.birdlife.org.au/projects/swift-parrot
- **Xeno-canto Database**: https://xeno-canto.org/
