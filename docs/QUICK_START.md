# TensorFlow.js Integration - Quick Start

## What You Have Now

Your app is ready to use TensorFlow.js models! Here's what's been set up:

### ✅ Installed Dependencies
- `@tensorflow/tfjs` - Run ML models in the browser
- `meyda` - Extract audio features (mel-spectrograms)

### ✅ Auto-Detection System
The app automatically detects if a TensorFlow model is available:
- **Model found** → Uses your trained TensorFlow model
- **No model** → Uses mock model for testing

### ✅ Audio Processing Pipeline
- Converts audio blobs to spectrograms
- Normalizes data to match training format
- Runs inference through TensorFlow.js

---

## 3 Steps to Use Your Model

### Step 1: Get Your Model Files

From your training environment:
```bash
tensorflowjs_converter \
    --input_format=keras \
    your_model.h5 \
    ./tfjs_model
```

This creates:
- `model.json`
- `group1-shard1of1.bin` (or multiple shards)

### Step 2: Add to Project

```bash
mkdir -p public/models/swift-parrot
# Copy model.json and .bin files here
```

### Step 3: Done!

Restart the app. It will automatically detect and load your model.

Check browser console for:
```
Loading TensorFlow.js model from /models/swift-parrot/model.json...
Model loaded successfully
```

---

## Alternative: Quick Test with Google Teachable Machine

Don't have a trained model yet? Create one in minutes:

1. Go to https://teachablemachine.withgoogle.com/train/audio
2. Click "Audio Project"
3. Create two classes:
   - "Swift Parrot" - Upload ~20 recordings
   - "Background" - Upload ~20 other sounds
4. Click "Train Model"
5. Export → "TensorFlow.js"
6. Download and unzip to `public/models/swift-parrot/`

---

## Current Behavior

### Without TensorFlow Model
- Uses **mock model** (random detections ~5% of time)
- Good for testing UI and data flow
- Ignores actual audio content

### With TensorFlow Model
- Analyzes real audio spectrograms
- Returns confidence based on learned patterns
- Responds to actual Swift Parrot calls

---

## Model Input/Output

### Expected Input
```
Shape: [1, 128, 128, 1]
Type: Mel-spectrogram
Format: Normalized float32 (0.0 - 1.0)
```

### Expected Output
```
Shape: [1, 1] or [1, 2]
Type: Confidence score(s)
Values: 0.0 (not parrot) to 1.0 (parrot)
```

---

## Files Created

### New Services
- `services/audioPreprocessing.ts` - Converts audio to spectrograms
- `services/detectionModelTensorFlow.ts` - TensorFlow model wrapper
- `services/modelFactory.ts` - Auto-detects and loads models

### Updated Services
- `services/sensorService.ts` - Now uses ModelFactory

### Documentation
- `docs/MODEL_REQUIREMENTS.md` - Full training guide
- `docs/TENSORFLOW_SETUP.md` - Detailed integration docs
- `docs/QUICK_START.md` - This file

---

## Testing Checklist

- [ ] Add model files to `public/models/swift-parrot/`
- [ ] Restart dev server
- [ ] Check console for "Model loaded successfully"
- [ ] Go to Settings tab, verify model name
- [ ] Start monitoring on Home tab
- [ ] Play Swift Parrot recording near microphone
- [ ] Check Detections tab for results

---

## Troubleshooting

### Model Not Loading
```
TensorFlow model not found, using mock model
```
→ Check file path: `public/models/swift-parrot/model.json`

### Low Confidence Scores
```
Inference completed in 245ms, confidence: 0.023
```
→ Model may need retraining or threshold adjustment

### Slow Performance
```
Inference completed in 5234ms, confidence: 0.873
```
→ Enable WebGL backend (auto-enabled by default)

---

## Need Help?

See full guides:
- **Training a model**: `docs/MODEL_REQUIREMENTS.md`
- **Integration details**: `docs/TENSORFLOW_SETUP.md`
