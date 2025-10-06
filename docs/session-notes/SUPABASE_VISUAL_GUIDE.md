# Supabase Setup - Visual Step-by-Step Guide

## 🎯 You're in the Wrong Section!

**Current location:** Storage (where you upload files)  
**Need to go to:** Edge Functions (where you create serverless functions)

---

## 📍 Step-by-Step Navigation

### Part 1: Go to Edge Functions

1. **Look at the LEFT sidebar in Supabase**
2. **Scroll down** until you see an icon that looks like `⚡` or `</>` 
3. **Click "Edge Functions"** (should be near bottom of sidebar)
4. You should see: https://supabase.com/dashboard/project/phayiovbyaaqimlshmxo/functions

### Part 2: Create the Edge Function

1. **Click big green "New Edge Function" or "Create a new function" button**
2. **Function name:** `analyze-birdcall` (exactly this, no caps, with hyphen)
3. **Click "Create"**
4. **You'll see a code editor** with some template code
5. **Select ALL the template code** (Ctrl+A)
6. **Delete it** (Backspace/Delete)
7. **Now paste the code:**
   - Open file: `C:\AI\biosys_swift\git\supabase\functions\analyze-birdcall\index.ts`
   - Select all (Ctrl+A)
   - Copy (Ctrl+C)
   - Back to Supabase browser
   - Paste (Ctrl+V)
8. **Look for Deploy button** - should be top-right, might say "Deploy" or have a rocket icon 🚀
9. **Click Deploy**
10. **Wait for success message**

### Part 3: Create Storage Bucket

1. **In left sidebar, click "Storage"**
2. **Click "New bucket"**
3. **Name:** `detections` (not "analyze-birdcall")
4. **Public:** OFF (uncheck)
5. **Create**
6. **Click on the "detections" bucket**
7. **Go to "Policies" tab**
8. **Create policy:**
   - New policy → For full customization
   - Name: `Allow all`
   - Operations: Check ALL (INSERT, SELECT, UPDATE, DELETE)
   - Policy: `true`
   - Save

### Part 4: Create Database Table

1. **In left sidebar, click "SQL Editor"**
2. **Click "New query"**
3. **Copy this SQL:**
   ```sql
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

   CREATE INDEX IF NOT EXISTS idx_detections_timestamp 
   ON detections(timestamp DESC);

   ALTER TABLE detections ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Allow anon inserts" ON detections
   FOR INSERT TO anon WITH CHECK (true);
   ```
4. **Click "Run"** or press F5
5. **Should see "Success"**

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Edge Function "analyze-birdcall" exists in Edge Functions section
- [ ] Edge Function shows "Deployed" status
- [ ] Storage bucket "detections" exists
- [ ] Database table "detections" exists (check in Table Editor)

---

## 🔍 Where to Find Things

| What | Where | URL |
|------|-------|-----|
| Edge Functions | Left sidebar ⚡ | /functions |
| Storage | Left sidebar 📦 | /storage |
| SQL Editor | Left sidebar 🗃️ | /sql |
| API Keys | Settings ⚙️ → API | /settings/api |

---

## 🆘 Still Can't Find Deploy Button?

**The Deploy button appears AFTER you create the Edge Function.**

**Steps:**
1. Click Edge Functions in sidebar
2. Click "New Edge Function" or "+ Create"
3. Enter name: `analyze-birdcall`
4. Click "Create"
5. **NOW** you'll see the code editor WITH a Deploy button

The button is usually:
- Top-right corner
- Says "Deploy" or has rocket icon 🚀
- Might be blue or green

---

**Try navigating to Edge Functions in the left sidebar first!**