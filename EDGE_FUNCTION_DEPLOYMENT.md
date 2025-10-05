# Edge Function Deployment Guide

## 🎯 Current Situation

The mobile app code is updated to use Supabase Storage→Edge Function approach.
The Edge Function code is updated locally but needs to be deployed to Supabase.

---

## 📋 Option A: Deploy via Supabase CLI (Recommended)

### Install Supabase CLI

**Windows (PowerShell as Administrator):**
```powershell
# Install scoop package manager if not installed
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Deploy Function

```bash
cd C:\AI\biosys_swift\git

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref 0ec90b57d6e95fcbda19832f

# Deploy the function
supabase functions deploy analyze-birdcall
```

---

## 📋 Option B: Deploy via Supabase Dashboard (Manual)

### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions**
   - Click "Edge Functions" in left sidebar
   - Find "analyze-birdcall" function

3. **Update Function Code**
   - Click on the function
   - Click "Edit"
   - Copy ENTIRE contents from: `C:\AI\biosys_swift\git\supabase\functions\analyze-birdcall\index.ts`
   - Paste into editor
   - Click "Save" or "Deploy"

4. **Verify Deployment**
   - Check deployment status
   - Should show "Deployed" or "Active"

---

## 📋 Option C: Test Without Deployment (Quick Test)

The existing Edge Function might still work with direct file upload from the app.

**Test by:**
1. Tap "Start Monitoring" in app
2. Watch logs

**If you see:**
```
✅ Uploaded to storage: temp/xxx.m4a
🔄 Calling Edge Function...
```

But Edge Function fails, then you MUST deploy the updated version.

---

## ⚡ Quick Deploy Steps (If Scoop Already Installed)

```powershell
# Install Supabase CLI (one time)
scoop install supabase

# Deploy (every time function changes)
cd C:\AI\biosys_swift\git
supabase login
supabase link --project-ref 0ec90b57d6e95fcbda19832f
supabase functions deploy analyze-birdcall
```

---

## 🔍 Verify Deployment

After deploying, the Edge Function should:
1. Accept JSON with `{storagePath, bucket}`
2. Download file from Supabase Storage
3. Upload to BirdNET using FormData
4. Return predictions

**Test Edge Function directly:**
```bash
curl -X POST https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/analyze-birdcall \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"storagePath":"temp/test.m4a","bucket":"detections"}'
```

---

## 📝 What Changed in Edge Function

**Before:**
- Expected: FormData with audio file directly
- Problem: React Native can't send FormData

**After:**
- Expects: JSON with storage path
- Downloads from Supabase Storage  
- Uses server-side FormData (works perfectly!)

---

**Once deployed, restart monitoring in the app to test!**