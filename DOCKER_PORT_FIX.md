# Docker Port Mapping Fix

## The Issue You Found

When running the BirdNET Docker container, you encountered:

1. **Port mismatch:** Container listens on port 80, not 8080
2. **PowerShell curl error:** Windows PowerShell's `curl` is an alias for `Invoke-WebRequest`
3. **TensorFlow warnings:** Gradient warnings appeared (these are normal)

## Root Cause

The `benjaminloeffel/birdnet-inference-api` Docker image runs Uvicorn on **port 80** inside the container:

```
INFO:     Uvicorn running on http://0.0.0.0:80 (Press CTRL+C to quit)
```

The old documentation incorrectly used `-p 8080:8080`, which tried to map host port 8080 to container port 8080 (which doesn't exist).

## The Fix

### Correct Command

```powershell
# Map host port 8080 to container port 80
docker run -p 8080:80 benjaminloeffel/birdnet-inference-api
```

The format is: `-p <HOST_PORT>:<CONTAINER_PORT>`
- Host port 8080: What you access on your machine
- Container port 80: What the service runs on inside Docker

### Testing on Windows

PowerShell's `curl` is actually `Invoke-WebRequest` with different behavior. Use one of these:

```powershell
# Option 1: Use real curl (curl.exe)
curl.exe http://localhost:8080/health

# Option 2: Use Invoke-WebRequest explicitly
Invoke-WebRequest -Uri http://localhost:8080/health

# Option 3: Open in browser
start http://localhost:8080/health
```

### Testing on Mac/Linux

```bash
curl http://localhost:8080/health
```

## About Those Warnings

These warnings are **normal and safe to ignore**:

```
WARNING:absl:Importing a function (...) with ops with unsaved custom gradients.
Will likely fail if a gradient is requested.
```

**Why they appear:** TensorFlow is warning that gradient calculations won't work.

**Why you don't care:** Gradients are only needed for training models. You're running inference (predictions), which doesn't need gradients.

**The key message is:**
```
INFO:     Application startup complete.
```

That means the server is ready! ✅

## Files Updated

All documentation has been corrected with the right port mapping:

- ✅ `QUICKSTART_BIRDNET.md` - Updated with `-p 8080:80`
- ✅ `docs/BIRDNET_SETUP.md` - Updated all Docker commands
- ✅ Added PowerShell-specific curl instructions
- ✅ Added troubleshooting for common issues
- ✅ Explained TensorFlow warnings

## Summary

**Before (Wrong):**
```bash
docker run -p 8080:8080 benjaminloeffel/birdnet-inference-api  # ❌ Wrong
curl http://localhost:8080/health  # ❌ Fails on PowerShell
```

**After (Correct):**
```powershell
docker run -p 8080:80 benjaminloeffel/birdnet-inference-api  # ✅ Correct
curl.exe http://localhost:8080/health  # ✅ Works on PowerShell
```

## Next Steps

1. Stop your current container (`Ctrl+C`)
2. Run with correct port mapping: `docker run -p 8080:80 benjaminloeffel/birdnet-inference-api`
3. In new terminal, test: `curl.exe http://localhost:8080/health`
4. Follow rest of `QUICKSTART_BIRDNET.md` to integrate with your app

Your BirdNET server should now be accessible! 🎉
