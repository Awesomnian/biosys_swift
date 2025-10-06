# New Supabase Project Setup Guide

## ✅ Credentials Updated

Your `.env` file has been updated with the new Supabase project credentials:
- Project URL: `https://phayiovbyaaqimlshmxo.supabase.co`
- Anon Key: Updated

---

## 📋 Setup Checklist

### Step 1: Create Storage Bucket

1. **In Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/phayiovbyaaqimlshmxo/storage/buckets
   - Click **"New bucket"**

2. **Bucket Settings:**
   - Name: `detections`
   - Public bucket: **OFF** (uncheck - keep private)
   - Click **"Create bucket"**

3. **Set Storage Policies:**
   - Click on the `detections` bucket
   - Click **"Policies"** tab
   - Click **"New policy"**
   - Choose **"For full customization"**
   - Policy name: `Allow authenticated uploads`
   - Allowed operation: **INSERT**
   - Policy definition:
     ```sql
     (auth.role() = 'authenticated') OR (auth.role() = 'anon')
     ```
   - Click **"Review"** then **"Save policy"**

4. **Add SELECT policy** (for Edge Function to download):
   - Click **"New policy"** again
   - Policy name: `Allow service role downloads`
   - Allowed operation: **SELECT**
   - Policy definition:
     ```sql
     true
     ```
   - Click **"Review"** then **"Save policy"**

5. **Add DELETE policy** (for cleanup):
   - Click **"New policy"**
   - Policy name: `Allow cleanup`
   - Allowed operation: **DELETE**
   - Policy definition:
     ```sql
     true
     ```
   - Click **"Review"** then **"Save policy"**

### Step 2: Create Database Table

1. **Go to SQL Editor:**
   - https://supabase.com/dashboard/project/phayiovbyaaqimlshmxo/sql/new

2. **Run this SQL:**
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

   -- Create index for faster queries
   CREATE INDEX IF NOT EXISTS idx_detections_timestamp 
   ON detections(timestamp DESC);

   -- Create index for device lookups
   CREATE INDEX IF NOT EXISTS idx_detections_device 
   ON detections(device_id);
   ```

3. **Click "Run"**

### Step 3: Create Edge Function

1. **Go to Edge Functions:**
   - https://supabase.com/dashboard/project/phayiovbyaaqimlshmxo/functions

2. **Click "Create a new function"**

3. **Function Settings:**
   - Name: `analyze-birdcall`
   - Click **"Create function"**

4. **In the code editor:**
   - **DELETE** all the template code
   - **Open** this file on your computer: `C:\AI\biosys_swift\git\supabase\functions\analyze-birdcall\index.ts`
   - **Copy EVERYTHING** (all 197 lines)
   - **Paste** into the Supabase editor

5. **Click "Deploy"** (top right)

6. **Wait for deployment** (10-30 seconds)
   - Should show "Deployed successfully"

---

## 🧪 Verify Setup

### Test 1: Storage Bucket Exists
```
✅ Can see "detections" bucket in Storage tab
✅ Policies are set (3 total: INSERT, SELECT, DELETE)
```

### Test 2: Database Table Exists
```sql
-- Run in SQL Editor:
SELECT * FROM detections LIMIT 1;

-- Should return: 0 rows (table exists but empty)
```

### Test 3: Edge Function Deployed
```
✅ Function appears in Edge Functions list
✅ Status shows "Deployed" or has recent deployment timestamp
✅ Code shows the updated version (look for "storagePath" in code)
```

---

## 🚀 Ready to Test!

Once all 3 steps are complete:

1. **Restart Expo** (in your terminal, press `r` to reload)
2. **Force quit app** on phone
3. **Reopen Expo Go** and scan QR code
4. **Tap "Start Monitoring"**

**Expected logs:**
```
📤 Step 1: Uploading to Supabase Storage...
✅ Uploaded to storage: temp/xxx.m4a
🔄 Step 2: Calling Edge Function...
📡 Edge Function response status: 200
✅ BirdNET analysis complete
```

---

## 📞 Need Help?

**If stuck on:**
- **Storage policies:** They can be tricky - just make sure INSERT, SELECT, and DELETE are all allowed
- **Edge Function deployment:** Make sure you copied ALL the code including imports
- **SQL table:** The migration should run without errors

**Common Issues:**
- **"Bucket not found":** Make sure it's named exactly `detections` (lowercase, plural)
- **"Function not found":** Edge Function deployment might have failed - check logs
- **"Unauthorized":** RLS policies might be too restrictive

---

## ✅ Checklist

Before testing:
- [ ] Storage bucket `detections` created
- [ ] Storage policies set (INSERT, SELECT, DELETE)
- [ ] Database table `detections` created
- [ ] Edge Function `analyze-birdcall` created and deployed
- [ ] Edge Function code updated (look for "storagePath")
- [ ] Expo restarted (press `r` in terminal)
- [ ] App force quit and reopened

**When all checked, you're ready to test! 🎉**