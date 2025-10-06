# Testing BirdNET Server Connection

This guide helps diagnose "Network request failed" errors when the app can't reach your BirdNET server.

---

## Quick Checklist

Before starting the app, verify these in order:

### 1. Check ngrok is Running
In your PowerShell window, you should see:
```
Forwarding   https://your-url.ngrok-free.dev -> http://localhost:8080
```

### 2. Check Docker is Running
```powershell
docker ps
```
Should show `benjaminloeffel/birdnet-inference-api` running.

### 3. Test BirdNET Locally
Browser → http://localhost:8080 → Should see BirdNET API docs

### 4. Test ngrok URL in Browser
Browser → https://your-ngrok-url.ngrok-free.dev → Should see BirdNET API docs

### 5. Check .env File
```
EXPO_PUBLIC_BIRDNET_SERVER_URL=https://your-actual-ngrok-url.ngrok-free.dev
```
Must match ngrok console URL EXACTLY!

### 6. Test from Phone Browser
Phone browser → ngrok URL → Should see BirdNET API docs

---

## Common Issues

### "Network request failed"
**Most likely:** ngrok URL changed or wrong in `.env`

**Fix:**
1. Check ngrok console for current URL
2. Update `.env` with correct URL
3. Force quit and restart mobile app

### ngrok URL keeps changing
**Cause:** Free ngrok generates new URLs on each restart

**Fix:** Keep ngrok running, or upgrade to paid plan

---

## Success Indicators

Everything works when:
1. Browser loads ngrok URL successfully
2. Phone browser loads ngrok URL successfully  
3. Segments Analyzed increments every 5 seconds
4. ngrok logs show POST requests with 200 status
5. No errors for 1+ minute of monitoring
