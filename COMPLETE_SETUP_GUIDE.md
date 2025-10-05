# Complete Setup Guide - BioSys Swift POC

## ✅ Already Done

Your app code is ready! All you need to do now is set up the new Supabase project.

**Credentials updated in `.env`:**
- ✅ Project URL: https://phayiovbyaaqimlshmxo.supabase.co
- ✅ Anon Key: Configured
- ✅ ngrok URL: Configured

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Create Storage Bucket (3 minutes)

1. **Navigate to Storage:**
   - https://supabase.com/dashboard/project/phayiovbyaaqimlshmxo/storage/buckets

2. **Create bucket:**
   - Click **"New bucket"** button
   - Name: `detections` (exact spelling, lowercase)
   - Public: **OFF** (uncheck the box)
   - Click **"Create bucket"**

3. **Set policies:** (Click on `detections` bucket → Policies tab)
   - Click **"New policy"**
   - Choose **"For full customization"**
   - Name: `Allow all operations`
   - Allowed operations: **SELECT all** (INSERT, SELECT, UPDATE, DELETE)
   - Target roles: Check **"anon"** and **"service_role"**
   - Policy definition: `true` (allow all)
   - Click **"Review"** → **"Save policy"**

### Step 2: Create Database Table (2 minutes)

1. **Go to SQL Editor:**
   - https://supabase.com/dashboard/project/phayiovbyaaqimlshmxo/sql/new

2. **Copy this entire SQL script:**
   ```sql
   -- Create detections table
   CREATE TABLE IF NOT EXISTS detections (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     device_id TEXT NOT NULL,
     timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     latitude DOUBLE PRECISION,
     longitude DOUBLE PRECISION,
     confidence DOUBLE PRECISION NOT NULL,
     model_name TEXT NOT NULL,
     audio_file_url TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Create indexes
   CREATE INDEX IF NOT EXISTS idx_detections_timestamp 
   ON detections(timestamp DESC);

   CREATE INDEX IF NOT EXISTS idx_detections_device 
   ON detections(device_id);

   -- Enable RLS
   ALTER TABLE detections ENABLE ROW LEVEL SECURITY;

   -- Allow anonymous inserts (for POC)
   CREATE POLICY "Allow anonymous inserts" ON detections
   FOR INSERT TO anon
   WITH CHECK (true);

   -- Allow all operations for authenticated users
   CREATE POLICY "Allow all for authenticated" ON detections
   FOR ALL TO authenticated
   USING (true);
   ```

3. **Paste into SQL Editor**

4. **Click "Run"** (or press Ctrl+Enter)

5. **Verify:** Should show "Success. No rows returned"

### Step 3: Create Edge Function (10 minutes)

1. **Go to Edge Functions:**
   - https://supabase.com/dashboard/project/phayiovbyaaqimlshmxo/functions

2. **Create new function:**
   - Click **"Create a new function"** button
   - Function name: `analyze-birdcall` (exact spelling)
   - Click **"Create function"**

3. **Update function code:**
   - You'll see a code editor with template code
   - **DELETE ALL** the template code
   - **Open this file on your computer:** `C:\AI\biosys_swift\git\supabase\functions\analyze-birdcall\index.ts`
   - **Copy ALL 197 lines**
   - **Paste into Supabase editor**

4. **Deploy:**
   - Click **"Deploy"** button (top right)
   - Wait for "Deployed successfully" message

5. **Verify deployment:**
   - Function should show in list
   - Status: "Deployed"
   - Click on function name to see code

---

## 🧪 Test the Setup

### Test 1: App Can Connect to Supabase

1. **In terminal** (where Expo is running), press **`r`** to reload
2. **On phone:** Force quit Expo Go, reopen, scan QR
3. **Check terminal logs** for:
   ```
   🔧 BirdNET Model initialized (Supabase Storage Proxy)
   ✅ BirdNET model ready (using Supabase Edge Function)
   ```

### Test 2: Storage Upload Works

1. **Tap "Start Monitoring"** in app
2. **Watch terminal logs** for:
   ```
   📤 Step 1: Uploading to Supabase Storage...
   ✅ Uploaded to storage: temp/xxx.m4a
   ```

3. **Check Supabase Storage:**
   - Go to Storage → detections bucket
   - Should see `temp/` folder with .m4a files

### Test 3: Edge Function Calls BirdNET

**Watch terminal logs for:**
```
🔄 Step 2: Calling Edge Function...
📡 Edge Function response status: 200
✅ BirdNET analysis complete
🏆 Top detection: [Species Name]
```

**Check ngrok logs for:**
```
POST /inference/ 200 OK
```

---

## 🎯 Success Criteria

You'll know everything is working when you see ALL of these:

**In Terminal:**
```
🔍 BirdNET Analysis Starting (via Supabase Storage)...
  📤 Step 1: Uploading to Supabase Storage...
  ✅ Uploaded to storage: temp/1728123456-abc.m4a
  🔄 Step 2: Calling Edge Function...
  📡 Edge Function response status: 200
  ⏱️  Total analysis time: 2000-3000ms
  ✅ BirdNET analysis complete
  🏆 Top detection: [Species Name]
```

**In ngrok Console:**
```
POST /inference/ 200 OK
```

**In App:**
- Segments Analyzed counter increments
- Current Confidence shows values
- No error messages

---

## 🐛 Troubleshooting

### "Storage upload failed"

**Check:**
- Bucket name is exactly `detections`
- Policies are set (should have at least INSERT and SELECT)
- `.env` has correct Supabase URL and anon key

**Fix:**
- Go back to Step 1 and verify bucket setup
- Check Storage policies tab

### "Edge Function failed" or status 404

**Check:**
- Function named exactly `analyze-birdcall`
- Function shows as "Deployed"
- Code was fully copied (all 197 lines)

**Fix:**
- Delete and recreate function
- Make sure to copy/paste ALL code from index.ts

### "BirdNET server returned 500"

**Check:**
- Docker is running: `docker ps`
- ngrok is running: Check terminal
- ngrok URL in Edge Function code matches current ngrok URL

**Fix:**
- Update line 50 in Edge Function if ngrok URL changed
- Redeploy function

---

## 📝 Summary

**What you need to do:**
1. ✅ Create `detections` storage bucket with policies (3 min)
2. ✅ Run SQL to create `detections` table (2 min)
3. ✅ Create & deploy `analyze-birdcall` Edge Function (10 min)
4. ✅ Test on phone (5 min)

**Total time:** ~20 minutes

**Then you'll have a working Swift Parrot monitoring POC! 🦜**

---

**Follow the steps in order, and you should see detections within 30 minutes!**

**💡 TIP:** Do each step one at a time and verify before moving to the next step.