# Model Comparison & Usage Guide

This guide helps you choose the right detection model for your Swift Parrot monitoring needs.

## Available Models

Your app supports three detection models:

### 1. Mock Model (Default)
**Purpose:** Testing and development

**How it works:**
- Generates random detections (~5% of time)
- No actual audio analysis
- Instant response (<100ms)

**When to use:**
- Testing UI and data flow
- Developing new features
- No BirdNET server or TensorFlow model available

**Setup:** None required - works out of the box

---

### 2. BirdNET Model (Recommended)
**Purpose:** Production use with pre-trained model

**How it works:**
- Sends audio to BirdNET server via edge function
- Analyzes with 6,000+ species model
- Returns confidence scores for all detected species
- Filters for Swift Parrot

**When to use:**
- Quick deployment without ML expertise
- Need high accuracy immediately
- Want to detect multiple species
- Testing with real recordings

**Setup time:** 30 minutes
**Accuracy:** Excellent (trained on thousands of recordings)
**Latency:** 1-3 seconds

**Setup:** See `BIRDNET_SETUP.md`

---

### 3. TensorFlow.js Model (Advanced)
**Purpose:** Custom trained model running in browser

**How it works:**
- Converts audio to mel-spectrogram in browser
- Runs inference with TensorFlow.js
- Custom model trained on your data
- No server required

**When to use:**
- Offline/edge deployment required
- Need faster response times (<500ms)
- Want to train on specific call types
- Have ML expertise and training data

**Setup time:** 1-2 weeks
**Accuracy:** Good (depends on training data)
**Latency:** <500ms

**Setup:** See `TENSORFLOW_SETUP.md` and `MODEL_REQUIREMENTS.md`

---

## Quick Comparison

| Feature | Mock | BirdNET | TensorFlow.js |
|---------|------|---------|---------------|
| **Setup** | ✅ Instant | ⚠️ 30 min | ❌ 1-2 weeks |
| **Accuracy** | ❌ None | ✅ Excellent | ⚠️ Good* |
| **Latency** | ✅ <100ms | ⚠️ 1-3s | ✅ <500ms |
| **Cost** | ✅ Free | ⚠️ $5-10/mo | ✅ Free |
| **Offline** | ✅ Yes | ❌ No | ✅ Yes |
| **ML Required** | ✅ No | ✅ No | ❌ Yes |
| **Multi-species** | ❌ No | ✅ Yes | ❌ No |

*Depends on training data quality

---

## Usage Instructions

### Using Mock Model (Default)

No code changes needed. The app uses the mock model automatically if no other model is configured.

```typescript
// Automatic - uses mock if no TensorFlow model found
const sensor = new SensorService(config, onStatsUpdate);
await sensor.initialize();
```

---

### Using BirdNET Model

**Step 1:** Start BirdNET server (see `BIRDNET_SETUP.md`)

**Step 2:** Update your sensor initialization:

```typescript
// In app/(tabs)/index.tsx (or wherever you create the sensor)

import { ModelFactory } from '@/services/modelFactory';
import { SensorService } from '@/services/sensorService';

// Create sensor with BirdNET model
const createSensor = async () => {
  const config = {
    deviceId: 'sensor-001',
    segmentDuration: 5000,
    detectionThreshold: 0.9,
    latitude: -42.8821,
    longitude: 147.3272,
  };

  const sensor = new SensorService(config, handleStatsUpdate);

  // Replace the default model with BirdNET
  sensor['detectionModel'] = await ModelFactory.createBirdNETModel(0.9);

  await sensor.storageService.initialize();

  return sensor;
};
```

**Alternative approach** - modify `SensorService.initialize()`:

```typescript
// In services/sensorService.ts
async initialize(): Promise<void> {
  // Replace this line:
  // this.detectionModel = await ModelFactory.autoDetectAndCreate(
  //   this.config.detectionThreshold
  // );

  // With this:
  this.detectionModel = await ModelFactory.createBirdNETModel(
    this.config.detectionThreshold
  );

  await this.storageService.initialize();
  this.updateStats();
}
```

**Step 3:** Test with Swift Parrot recording

---

### Using TensorFlow.js Model

**Step 1:** Train and convert your model (see `MODEL_REQUIREMENTS.md`)

**Step 2:** Place model files:
```
public/models/swift-parrot/
  ├── model.json
  └── group1-shard1of1.bin
```

**Step 3:** The app automatically detects and uses it!

```typescript
// No code changes needed - ModelFactory.autoDetectAndCreate()
// checks for TensorFlow model first
const sensor = new SensorService(config, onStatsUpdate);
await sensor.initialize();
```

---

## Switching Models at Runtime

You can switch between models without restarting the app:

```typescript
// In your component
const switchToBirdNET = async () => {
  const newModel = await ModelFactory.createBirdNETModel(0.9);
  sensorService['detectionModel'] = newModel;
  console.log('Switched to BirdNET');
};

const switchToTensorFlow = async () => {
  const newModel = await ModelFactory.createModel({
    type: 'tensorflow',
    modelPath: '/models/swift-parrot/model.json',
    threshold: 0.9,
  });
  sensorService['detectionModel'] = newModel;
  console.log('Switched to TensorFlow');
};

const switchToMock = async () => {
  const newModel = await ModelFactory.createModel({
    type: 'mock',
    threshold: 0.9,
  });
  sensorService['detectionModel'] = newModel;
  console.log('Switched to Mock');
};
```

---

## Model Selection Decision Tree

```
START: Need Swift Parrot detection
    |
    ├─> Just testing UI? → Mock Model
    |
    ├─> Need accuracy NOW?
    |   └─> Have $5-10/mo for server? → BirdNET
    |   └─> No budget? → Train TensorFlow model
    |
    ├─> Need offline operation?
    |   └─> Train TensorFlow model
    |
    └─> Need fastest response?
        └─> Train TensorFlow model
```

---

## Recommended Path

**For most users, we recommend:**

1. **Start with Mock** (0 min setup)
   - Test the app interface
   - Understand the data flow
   - Verify Supabase storage works

2. **Deploy BirdNET** (30 min setup)
   - Test with real Swift Parrot recordings
   - Measure false positive rate
   - Collect field data

3. **Optional: Train Custom Model** (1-2 weeks)
   - If you need offline operation
   - If you need faster responses
   - If BirdNET doesn't meet accuracy needs

---

## Performance Tuning

### Adjusting Detection Threshold

Lower threshold = more detections (more false positives)
Higher threshold = fewer detections (fewer false positives)

```typescript
// Sensitive - catches more birds but more false alarms
const model = await ModelFactory.createBirdNETModel(0.7);

// Balanced - good middle ground
const model = await ModelFactory.createBirdNETModel(0.85);

// Strict - only very confident detections
const model = await ModelFactory.createBirdNETModel(0.95);
```

### Optimizing Audio Segment Duration

```typescript
// Shorter segments = faster processing, less context
const config = {
  segmentDuration: 3000, // 3 seconds
  // ...
};

// Longer segments = more context, slower processing
const config = {
  segmentDuration: 10000, // 10 seconds
  // ...
};

// Recommended: 5 seconds
const config = {
  segmentDuration: 5000, // 5 seconds
  // ...
};
```

---

## Monitoring Model Performance

Check model performance in the browser console:

```javascript
// BirdNET
BirdNET analysis completed in 1234ms, confidence: 0.923
Swift Parrot detected! Species: Swift Parrot

// TensorFlow.js
Inference completed in 245ms, confidence: 0.873

// Mock
// No console logs (instant random results)
```

---

## Troubleshooting

### BirdNET Not Working

1. Check BirdNET server is running
2. Verify edge function is deployed
3. Check browser console for errors
4. Test edge function manually:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/analyze-birdcall \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -F "audio=@test.wav"
   ```

### TensorFlow.js Not Loading

1. Verify files exist at `/models/swift-parrot/model.json`
2. Check browser console for load errors
3. Confirm model.json references correct shard files
4. Try opening model.json URL directly in browser

### Low Confidence Scores

1. Test with high-quality Swift Parrot recording from Xeno-canto
2. Ensure audio is clear with minimal background noise
3. Try lowering detection threshold
4. Check microphone input levels

---

## Next Steps

1. Choose your model based on requirements
2. Follow setup guide for chosen model
3. Test with recordings from [Xeno-canto](https://xeno-canto.org/species/Lathamus-discolor)
4. Deploy to field and monitor results
5. Adjust threshold based on false positive rate

---

## Resources

- **BirdNET Setup**: `docs/BIRDNET_SETUP.md`
- **TensorFlow Setup**: `docs/TENSORFLOW_SETUP.md`
- **Model Training**: `docs/MODEL_REQUIREMENTS.md`
- **Quick Start**: `docs/QUICK_START.md`
