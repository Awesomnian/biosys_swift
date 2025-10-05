# Expo Development Build Guide - BioSys Swift

## 🎯 Why Development Build?

Expo Go has networking limitations on Android that prevent file uploads.
A Development Build creates a proper Android APK where networking works normally.

---

## 📋 Step-by-Step Build Process

### Step 1: Install Dependencies ✅

You've already run:
```bash
npx expo install expo-dev-client
```

Wait for it to complete, then continue.

### Step 2: Update app.json

Add expo-dev-client to plugins:

**File: `C:\AI\biosys_swift\git\app.json`**

Find the `"plugins"` array and make sure it includes `"expo-dev-client"`:

```json
{
  "expo": {
    "plugins": [
      "expo-dev-client",
      "expo-router",
      ...
    ]
  }
}
```

### Step 3: Create Android Project

**In VS Code terminal (stop Expo first with Ctrl+C):**

```bash
npx expo prebuild --platform android
```

This creates the native Android project files.

### Step 4: Build the Development APK

**Option A - Build Locally (Faster, requires Android Studio):**
```bash
npx expo run:android
```

**Option B - Build with EAS (Cloud build, slower but easier):**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Create build
eas build --profile development --platform android
```

### Step 5: Install APK on Phone

**If built locally (Option A):**
- APK auto-installs via USB or WiFi
- App opens automatically

**If built with EAS (Option B):**
- Download APK from EAS dashboard
- Transfer to phone (email, Drive, etc.)
- Install APK (allow "Install from unknown sources")

---

## 🧪 Testing the Development Build

### Step 1: Start Metro Bundler

```bash
npx expo start --dev-client
```

### Step 2: Open App on Phone

- **NOT Expo Go!**
- Open the **"BioSys: Swift" app** you just installed
- Should connect to Metro bundler automatically

### Step 3: Test Monitoring

1. **Tap "Start Monitoring"**
2. **Watch VS Code terminal** for:
   ```
   📤 Uploading to Supabase Storage...
   ✅ Uploaded to storage: temp/xxx.m4a
   🔄 Calling Edge Function...
   📡 Status: 200
   ✅ BirdNET analysis complete
   ```

---

## ⚡ Quick Start (Recommended)

**If you have Android Studio OR want fastest path:**

```bash
# Stop Expo (Ctrl+C in terminal)

# Install dev client (already done)
# npx expo install expo-dev-client

# Create Android project
npx expo prebuild --platform android

# Build and run
npx expo run:android
```

**This will:**
1. Create native Android project
2. Build APK
3. Install on connected phone (via USB or WiFi)
4. Launch app automatically

---

## 🔧 Requirements

### For Local Build (npx expo run:android):
- Android Studio installed
- Android SDK configured
- USB debugging enabled on phone OR phone on same WiFi

### For EAS Cloud Build:
- Expo account (free)
- EAS CLI installed
- Internet connection
- ~10-20 minutes wait time

---

## 📱 What Changes

**Expo Go (current):**
- ❌ Limited networking
- ❌ Can't upload files
- ✅ Quick to test
- ✅ No build required

**Development Build (new):**
- ✅ Full networking support
- ✅ File uploads work
- ⚠️ Requires rebuild for native changes
- ⚠️ Longer initial setup

---

## 🎯 Expected Outcome

After installing Development Build:

**File uploads will work!** No more "Network request failed" errors.

**The Supabase Storage approach should succeed:**
```
📤 Uploading to Supabase Storage...
✅ Uploaded successfully
🔄 Edge Function analyzing...
✅ BirdNET detections returned
```

---

## 💡 Tips

1. **USB debugging:** Easier than WiFi for first build
2. **Keep phone connected:** Helps with installation
3. **Allow "Install from unknown sources":** Required for local builds
4. **First build takes 5-15 minutes:** Subsequent rebuilds are faster

---

## 🆘 If Build Fails

**Common issues:**

**"Android SDK not found":**
- Need to install Android Studio
- Or configure ANDROID_HOME environment variable

**"No devices found":**
- Enable USB debugging on phone
- Or use --device flag to specify device

**"Build failed":**
- Try cleaning: `npx expo prebuild --clean`
- Check you have space on disk
- Make sure Java JDK is installed

---

## 📞 Next Steps

1. ✅ Wait for `expo-dev-client` to install
2. ⏭️ Add to app.json plugins
3. ⏭️ Run `npx expo prebuild --platform android`
4. ⏭️ Run `npx expo run:android`
5. ⏭️ Test monitoring
6. ⏭️ Celebrate working POC! 🎉

---

**Once expo-dev-client installation finishes, let me know and I'll help with the next steps!**