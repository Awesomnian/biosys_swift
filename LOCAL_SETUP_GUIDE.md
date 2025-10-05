# Local Setup Guide - Running Expo on Your Machine

## 🎯 Situation

You were previously using Bolt's remote server to run Expo, but we've made changes to the **local** files in `C:\AI\biosys_swift\git\`. To test these changes, you need to run Expo from your local Windows machine.

**The old QR code won't work** because it points to Bolt's server, not your updated local code.

---

## 📋 Prerequisites Check

Before starting, verify you have these installed:

### 1. Node.js and npm

Open Command Prompt or PowerShell and run:
```bash
node --version
npm --version
```

**Expected output:**
```
v18.x.x or higher
9.x.x or higher
```

**If not installed:**
- Download from: https://nodejs.org/ (LTS version)
- Install, then restart your terminal

### 2. Git (Already have this since you cloned the repo)

```bash
git --version
```

Should show: `git version 2.x.x`

---

## 🚀 Setup Steps

### Step 1: Navigate to Project

```bash
cd C:\AI\biosys_swift\git
```

### Step 2: Install Dependencies

**If you haven't already:**
```bash
npm install
```

This will:
- Install all packages from `package.json`
- Including `expo`, `expo-file-system`, and all dependencies
- Takes 2-5 minutes depending on internet speed

**Expected output:**
```
added XXX packages in XXs
```

### Step 3: Verify expo-file-system

```bash
npm list expo-file-system
```

Should show:
```
expo-file-system@19.0.16
```

### Step 4: Start Expo Locally

```bash
npx expo start --clear
```

**What this does:**
- Clears Expo cache (important!)
- Starts local development server
- Generates a **new QR code** for your phone

**Expected output:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android)
```

You'll see a NEW QR code - this is the one you need!

---

## 📱 Connect Your Phone

### Option 1: QR Code (Recommended)

1. **On phone:** Open Expo Go app
2. **Force quit** any existing BioSys Swift instance
3. **Scan the new QR code** from your terminal
4. App will load with your updated code

### Option 2: Link (Alternative)

If QR code doesn't work:
1. Terminal shows: `exp://192.168.x.x:8081`
2. Make sure phone and laptop are on **same WiFi**
3. In Expo Go, tap "Enter URL manually"
4. Type the exp:// URL shown in terminal

---

## ✅ Verification

After scanning QR code, you should see:

**In Terminal:**
```
› Opening exp://192.168.x.x:8081 on Android
› Loading...
› Bundled 1234 modules
```

**On Phone:**
```
"BioSys: Swift" app loads
Shows Monitor screen
```

---

## 🔍 Troubleshooting

### Issue: "command not found: npx"

**Cause:** Node.js not installed or not in PATH

**Solution:**
```bash
# Install Node.js from nodejs.org
# Restart terminal
# Try again
```

### Issue: "Cannot find module 'expo'"

**Cause:** Dependencies not installed

**Solution:**
```bash
cd C:\AI\biosys_swift\git
npm install
```

### Issue: "Port 8081 already in use"

**Cause:** Another Expo/React Native server running

**Solution:**
```bash
# Find and kill the process
netstat -ano | findstr :8081
taskkill /PID <PID_NUMBER> /F

# Or just restart and try again
npx expo start --clear
```

### Issue: Phone can't connect to laptop

**Causes:**
1. Different WiFi networks
2. Firewall blocking port 8081
3. VPN interfering

**Solutions:**
```bash
# Check your laptop's IP
ipconfig

# Look for: IPv4 Address: 192.168.x.x
# Phone must be on same network

# Try tunnel mode (slower but works):
npx expo start --tunnel
```

### Issue: Old app still loading

**Solution:**
1. Force quit Expo Go completely
2. Swipe away from recent apps
3. Clear Expo Go cache (Settings > Apps > Expo Go > Clear Cache)
4. Reopen and scan NEW QR code

---

## 🔄 Comparison: Bolt Server vs Local

### Bolt Server (Old - Don't Use):
```
Bolt Server → Old Code → Old QR Code → ❌ Won't have your fixes
```

### Local Machine (New - Use This):
```
Your PC → Updated Code → New QR Code → ✅ Has all fixes
```

---

## 🎯 Complete Testing Flow

### On Your PC:

```bash
# 1. Navigate to project
cd C:\AI\biosys_swift\git

# 2. Ensure Docker is running
docker ps
# Should show: birdnet container

# 3. Ensure ngrok is running
# Check PowerShell window for: https://pruinose-alise-uncooled.ngrok-free.dev

# 4. Start Expo locally
npx expo start --clear

# 5. Leave this terminal open - watch for logs
```

### On Your Phone:

```
1. Force quit Expo Go
2. Reopen Expo Go
3. Scan NEW QR code from terminal
4. Grant permissions (microphone, location)
5. Tap "Start Monitoring"
6. Watch laptop terminal for logs
```

---

## 💡 Why Local is Better

1. **Faster:** No network latency to remote server
2. **Debugging:** See logs directly in your terminal
3. **Control:** Full control over restart, cache clearing
4. **Testing:** Changes apply immediately
5. **Development:** Standard React Native workflow

---

## 🆘 Still Having Issues?

### Quick Diagnostics:

```bash
# Check you're in right directory
pwd
# Should show: C:\AI\biosys_swift\git

# Check Node.js
node --version
# Should be: v18+ or v20+

# Check npm
npm --version
# Should be: 9+

# Check dependencies
npm list | head -20
# Should show expo packages

# Check for errors
npm install
# Should complete without errors
```

### Nuclear Option (If All Else Fails):

```bash
# Remove and reinstall everything
cd C:\AI\biosys_swift\git
rmdir /s node_modules
del package-lock.json
npm install
npx expo start --clear
```

---

## 📝 Summary

**You need to:**
1. ✅ Have Node.js installed locally
2. ✅ Run `npm install` in `C:\AI\biosys_swift\git\`
3. ✅ Run `npx expo start --clear` (not from Bolt)
4. ✅ Scan the **NEW** QR code with Expo Go
5. ✅ The old Bolt QR code won't work anymore

**Your setup:**
- Code: Local (`C:\AI\biosys_swift\git\`)
- Expo server: Local (your PC)
- BirdNET: Local Docker
- ngrok: Local tunnel
- Phone: Connects to your PC via QR code

---

**Once Expo starts locally and shows the QR code, scan it and you're ready to test! 🚀**