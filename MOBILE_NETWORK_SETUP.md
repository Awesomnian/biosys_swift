# Mobile Network Access Setup

## The Problem

Your mobile device **cannot reach ngrok URLs** running on localhost because:

1. **ngrok on laptop** → forwards `localhost:8080` to public URL
2. **Mobile device** → tries to connect to ngrok URL
3. **ngrok requires** your mobile device to be on the **same network** OR you need the **paid ngrok plan**

## Quick Solutions

### Option 1: Use Mock Model (Testing Only)

For UI testing without real bird detection:

**On Mobile App:**
1. Stop monitoring if running
2. The app will automatically use the mock model
3. It generates random detections for testing

**Limitation:** No real bird detection

### Option 2: Deploy BirdNET to Cloud (Recommended)

Deploy your Docker container to a cloud service:

#### Railway (Easiest - $5/month)

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy Docker Image"
3. Enter: `benjaminloeffel/birdnet-inference-api`
4. Railway will give you a public URL like: `https://your-app.railway.app`
5. Update `.env`:
   ```
   EXPO_PUBLIC_BIRDNET_SERVER_URL=https://your-app.railway.app
   ```
6. Restart your mobile app

#### Digital Ocean ($6/month)

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Docker
apt update && apt install docker.io

# Run BirdNET
docker run -d -p 8080:80 --restart=always benjaminloeffel/birdnet-inference-api

# Get droplet IP
curl ifconfig.me
```

Update `.env`:
```
EXPO_PUBLIC_BIRDNET_SERVER_URL=http://YOUR_DROPLET_IP:8080
```

### Option 3: ngrok on Same WiFi Network

**Requirements:**
- Laptop and mobile on **same WiFi**
- ngrok **free plan** works

**Setup:**

1. Get your laptop's local IP:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```

2. On mobile, try accessing: `http://YOUR_LAPTOP_IP:8080` directly
   - If it works, update `.env` to use this IP
   - If blocked by firewall, use ngrok

3. Make sure ngrok is running:
   ```bash
   ngrok http 8080
   ```

4. Use the ngrok HTTPS URL in `.env`

## Current Architecture

```
Your Mobile Device
    ↓ (needs internet/network access)
    ↓
EXPO_PUBLIC_BIRDNET_SERVER_URL
    ↓
BirdNET API Server (must be publicly accessible)
    ↓
Returns bird species predictions
```

## Troubleshooting

### Error: "BirdNET server unreachable"

**Solution:**
- Verify the URL is accessible from your mobile browser
- Open Safari/Chrome on mobile
- Visit: `YOUR_BIRDNET_URL/docs` (should show API docs)
- If it doesn't load, the URL isn't reachable

### Error: "Network request failed"

**Solutions:**
1. Check mobile device has internet connection
2. Check BirdNET URL is correct in `.env`
3. Try accessing URL in mobile browser first
4. Restart mobile app after changing `.env`

### ngrok URL keeps changing

**Problem:** Free ngrok URLs change on restart

**Solutions:**
1. Use ngrok paid plan ($8/month) for permanent URL
2. Deploy to Railway/Digital Ocean instead
3. Update `.env` each time ngrok restarts

## Recommended Setup for Development

**Local Development (Testing UI):**
- Use mock model (no server needed)
- Test all UI features

**Real Testing (Bird Detection):**
- Deploy BirdNET to Railway ($5/month)
- Permanent URL, accessible anywhere
- No ngrok hassle

**Production:**
- Deploy BirdNET to Digital Ocean or AWS
- Set up proper domain name
- Enable HTTPS with Let's Encrypt
