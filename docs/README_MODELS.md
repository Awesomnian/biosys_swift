# Swift Parrot Detection Models - Complete Guide

Welcome! This guide helps you get started with bird sound detection models for your BioSys: Swift app.

## What's Available

Your app now supports **three detection models**:

| Model | Best For | Setup Time | Docs |
|-------|----------|------------|------|
| **Mock** | Testing UI | 0 min | Built-in |
| **BirdNET** | Production use | 30 min | [BIRDNET_SETUP.md](BIRDNET_SETUP.md) |
| **TensorFlow.js** | Custom training | 1-2 weeks | [TENSORFLOW_SETUP.md](TENSORFLOW_SETUP.md) |

## Quick Start Paths

### Path 1: I Just Want to Test the App
→ Use the **Mock Model** (already configured)
- Start the app and click "Start Monitoring"
- See random detections appear
- Test UI and data flow

### Path 2: I Want Real Detection Now
→ Use **BirdNET** (30 minutes setup)
1. [Install BirdNET](BIRDNET_SETUP.md#step-1-install-birdnet)
2. [Start BirdNET server](BIRDNET_SETUP.md#step-2-start-birdnet-server)
3. [Update app code](USAGE_EXAMPLE.md#option-1-force-birdnet-model-recommended)
4. Test with Swift Parrot recordings

### Path 3: I Want to Train My Own Model
→ Use **TensorFlow.js** (1-2 weeks)
1. [Collect training data](MODEL_REQUIREMENTS.md#step-1-collect-data)
2. [Train model in Python](MODEL_REQUIREMENTS.md#step-3-train-model-in-python)
3. [Convert to TensorFlow.js](MODEL_REQUIREMENTS.md#step-4-convert-to-tensorflowjs)
4. [Add to project](QUICK_START.md)

---

## Documentation Index

### Getting Started
- **[QUICK_START.md](QUICK_START.md)** - 3-step TensorFlow.js integration
- **[USAGE_EXAMPLE.md](USAGE_EXAMPLE.md)** - Code examples for using BirdNET
- **[MODEL_COMPARISON.md](MODEL_COMPARISON.md)** - Compare all three models

### BirdNET (Recommended)
- **[BIRDNET_SETUP.md](BIRDNET_SETUP.md)** - Complete BirdNET setup guide
  - Local development setup
  - Production deployment options
  - Troubleshooting guide

### TensorFlow.js (Advanced)
- **[MODEL_REQUIREMENTS.md](MODEL_REQUIREMENTS.md)** - Training your own model
  - Model architecture requirements
  - Data collection guide
  - Training process
- **[TENSORFLOW_SETUP.md](TENSORFLOW_SETUP.md)** - Integrating trained models
  - File placement
  - Configuration options
  - Testing guide

---

## Recommended Approach

**We recommend this progression:**

```
Week 1: Mock Model
  ↓
  Test UI, understand data flow
  ↓
Week 2: BirdNET
  ↓
  Deploy BirdNET server
  Test with real recordings
  Measure accuracy
  ↓
Week 3+: Evaluate
  ↓
  Is BirdNET good enough? → Done!
  Need offline/faster? → Train TensorFlow model
```

---

## Files Created

### Services
```
services/
├── detectionModel.ts              (Mock model)
├── detectionModelTensorFlow.ts    (TensorFlow.js model)
├── detectionModelBirdNET.ts       (BirdNET model) ✨ NEW
├── modelFactory.ts                (Model selection) ✨ UPDATED
├── audioPreprocessing.ts          (Spectrogram extraction) ✨ NEW
├── sensorService.ts               (Main sensor service) ✨ UPDATED
├── audioCapture.ts                (Audio recording)
└── storageService.ts              (Supabase storage)
```

### Edge Functions
```
supabase/functions/
└── analyze-birdcall/
    └── index.ts                   (BirdNET API proxy) ✨ NEW
```

### Documentation
```
docs/
├── README_MODELS.md               (This file) ✨ NEW
├── QUICK_START.md                 (3-step TF.js guide) ✨ NEW
├── BIRDNET_SETUP.md               (BirdNET setup) ✨ NEW
├── TENSORFLOW_SETUP.md            (TF.js integration) ✨ NEW
├── MODEL_REQUIREMENTS.md          (Training guide) ✨ NEW
├── MODEL_COMPARISON.md            (Model comparison) ✨ NEW
└── USAGE_EXAMPLE.md               (Code examples) ✨ NEW
```

---

## How It Works

### Current Architecture

```
┌─────────────────────────────────────────────────┐
│  Your App (React Native + Expo)                │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ SensorService                            │  │
│  │  - Captures audio (5 second segments)   │  │
│  │  - Sends to detection model             │  │
│  │  - Stores positive detections           │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ ModelFactory                             │  │
│  │  - Auto-detects available models        │  │
│  │  - Creates appropriate model instance   │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌─────────┬──────────────┬─────────────────┐  │
│  │ Mock    │ TensorFlow.js│ BirdNET         │  │
│  │ Model   │ Model        │ Model           │  │
│  └─────────┴──────────────┴─────────────────┘  │
└─────────────────────────────────────────────────┘
                     ↓
    ┌────────────────────────────────────┐
    │ Supabase                           │
    │  - Storage (audio files)          │
    │  - Database (detections metadata) │
    │  - Edge Functions (BirdNET proxy) │
    └────────────────────────────────────┘
                     ↓
         ┌──────────────────────┐
         │ BirdNET Server       │
         │  (Optional)          │
         └──────────────────────┘
```

---

## Testing Resources

### Swift Parrot Recordings

Download test audio from:
- **Xeno-canto**: https://xeno-canto.org/species/Lathamus-discolor
  - 100+ free Swift Parrot recordings
  - Various call types and quality levels
  - Click download button for WAV files

- **Macaulay Library**: https://www.macaulaylibrary.org/
  - Cornell's massive bird sound database
  - High-quality recordings

- **Australian Wildlife Sounds**: https://wildambience.com/
  - Professional-grade recordings
  - Some free samples available

### Recommended Test Recordings

Try these high-quality Swift Parrot recordings:
1. [XC753251](https://xeno-canto.org/753251) - Clear contact calls
2. [XC753250](https://xeno-canto.org/753250) - Flight calls
3. [XC753249](https://xeno-canto.org/753249) - Feeding calls

---

## Common Questions

### Which model should I use?

**For quick testing:** Mock model (works immediately)
**For production:** BirdNET (30 min setup, excellent accuracy)
**For offline deployment:** TensorFlow.js (requires training)

### Do I need all three models?

No! Choose one based on your needs. Most users should start with BirdNET.

### Can I switch models later?

Yes! All models use the same interface, so switching is easy.

### How accurate is BirdNET?

BirdNET is trained on thousands of recordings and achieves very high accuracy for most species. Test with your specific recordings to evaluate.

### How much does BirdNET cost to run?

- **Development**: Free (run locally)
- **Production**: $5-10/month (small cloud server)

### Can BirdNET detect other species?

Yes! BirdNET recognizes 6,000+ species. Your app filters for Swift Parrots, but you can modify it to detect any species.

---

## Getting Help

### Issues with BirdNET
→ See troubleshooting section in [BIRDNET_SETUP.md](BIRDNET_SETUP.md#troubleshooting)

### Issues with TensorFlow.js
→ See troubleshooting section in [TENSORFLOW_SETUP.md](TENSORFLOW_SETUP.md#troubleshooting)

### General questions about models
→ See [MODEL_COMPARISON.md](MODEL_COMPARISON.md)

### Code integration questions
→ See [USAGE_EXAMPLE.md](USAGE_EXAMPLE.md)

---

## Next Steps

1. **Choose your model** based on requirements
2. **Follow setup guide** for chosen model
3. **Test with recordings** from Xeno-canto
4. **Deploy to field** and monitor results
5. **Tune threshold** based on false positive rate

---

## Project Status

✅ **Mock Model** - Working (default)
✅ **BirdNET Integration** - Complete (needs server)
✅ **TensorFlow.js Support** - Complete (needs trained model)
✅ **Edge Functions** - Deployed
✅ **Documentation** - Complete

---

## Contributing

Found an issue or have suggestions? The codebase is well-documented and modular:

- **Add new model type**: Create new service in `services/`, update `modelFactory.ts`
- **Improve preprocessing**: Modify `audioPreprocessing.ts`
- **Add features**: Services follow single responsibility principle

---

## License & Acknowledgments

**BirdNET:**
- Developed by Stefan Kahl, Chemnitz University of Technology
- Research project with public model and code
- See: https://github.com/birdnet-team/BirdNET-Analyzer

**TensorFlow.js:**
- Google's JavaScript ML framework
- See: https://www.tensorflow.org/js

**Swift Parrot Conservation:**
- Critically endangered Tasmanian endemic
- Learn more: https://www.birdlife.org.au/projects/swift-parrot
