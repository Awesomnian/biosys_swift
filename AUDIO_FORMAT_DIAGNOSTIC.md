# Audio Format Diagnostic Guide

## 🎯 Current Situation

**Upload is WORKING** ✅  
FileSystem.uploadAsync() successfully uploads files to BirdNET server.

**BirdNET can't read files** ❌  
Server returns: `"Format not recognised"`

---

## 🔍 Diagnostic Steps

### Step 1: Test BirdNET with Known-Good File

Test if BirdNET Docker container is working at all:

**Windows PowerShell:**
```powershell
# Using Invoke-WebRequest (PowerShell's curl)
$file = "C:\AI\biosys_swift\BirdNET-Analyzer\birdnet_analyzer\example\soundscape.wav"
$uri = "https://pruinose-alise-uncooled.ngrok-free.dev/inference/"

# Create multipart form
$form = @{
    file = Get-Item -Path $file
}

Invoke-WebRequest -Uri $uri -Method Post -Form $form -Headers @{"ngrok-skip-browser-warning"="true"}
```

**Expected:** Status 200 with JSON predictions  
**If this fails:** BirdNET Docker issue  
**If this works:** Problem is with mobile audio files

### Step 2: Extract Audio File from Phone

The app creates files at:
```
file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Fbiosys-swift-.../Audio/recording-xxx.m4a
```

**Option A: Save to Supabase First**
Temporarily modify the code to save the file before upload, then download and test it.

**Option B: Use Android Debug Bridge (ADB)**
```bash
# List Android devices
adb devices

# Pull audio file from device
adb pull /data/user/0/host.exp.exponent/cache/ExperienceData/@anonymous/biosys-swift-*/Audio/ ./test-audio/

# Test with BirdNET
curl -X POST https://pruinose-alise-uncooled.ngrok-free.dev/inference/ -F "file=@./test-audio/recording-xxx.m4a" -H "ngrok-skip-browser-warning: true"
```

### Step 3: Check Audio Recording

Possible issues:
1. **Recording not starting** - File created but empty
2. **Encoder incompatibility** - AAC format not compatible
3. **File corruption during transfer**

**Test by checking file size:**
- 5 seconds at 44.1kHz, 1 channel, 128kbps ≈ 80KB ✅ (matches your logs!)
- If file was empty it would be <1KB
- File size looks correct, so recording IS working

---

## 🔧 Possible Solutions

### Solution A: Test with ffmpeg Conversion

If you have ffmpeg installed:
```bash
# Convert one of the phone's m4a files to wav
ffmpeg -i recording.m4a -ar 44100 -ac 1 recording-converted.wav

# Test converted file
curl -X POST https://pruinose-alise-uncooled.ngrok-free.dev/inference/ -F "file=@recording-converted.wav"
```

### Solution B: Check BirdNET Supported Formats

According to BirdNET documentation, it supports:
- WAV (PCM, preferred)
- MP3
- M4A/AAC
- FLAC
- OGG

Since M4A is supported, the issue might be:
- Specific AAC codec variant
- Missing audio metadata
- File header corruption

### Solution C: Try Direct File Path (No FileSystem.uploadAsync)

Create a simple test that uploads the file using Python/Node.js on the server side to verify BirdNET works:

```python
import requests

with open('test.m4a', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:8080/inference/', files=files)
    print(response.json())
```

---

## 🐛 Likely Root Cause

The issue is probably that **FileSystem.uploadAsync() might not be sending the file data correctly**, or **Android's AAC encoder creates files BirdNET can't parse**.

### Evidence:
1. ✅ File size is correct (82KB)
2. ✅ Upload completes successfully  
3. ✅ BirdNET receives request
4. ❌ BirdNET can't open the BytesIO object
5. ❌ "Format not recognised" despite M4A being supported

This suggests the file **data** is corrupt or malformed, even though the file **size** is correct.

---

## 💡 Alternative Approach

### Use Supabase Storage Proxy (Original Architecture)

Instead of direct upload:

1. **Upload audio to Supabase Storage** (we know this works)
2. **Trigger Supabase Edge Function**
3. **Edge Function downloads from Storage**
4. **Edge Function uploads to BirdNET**
5. **Returns results to app**

This bypasses FileSystem.uploadAsync() entirely and uses proven Supabase uploads.

**Would require:**
- Updating supabase/functions/analyze-birdcall/index.ts
- Modifying storageService to upload first
- Edge function handles BirdNET communication

---

## 🎯 Immediate Next Step

**Test BirdNET with a known-good audio file using PowerShell/curl** to confirm Docker container is working correctly.

If that works, the issue is definitely with how the mobile audio files are being encoded/uploaded.

If that fails, BirdNET Docker setup has an issue.