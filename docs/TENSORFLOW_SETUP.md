# TensorFlow.js Model Integration Guide

This guide shows you how to integrate a trained TensorFlow.js model into your Swift Parrot Detection app.

## Quick Start

### 1. Get Your Model Files

You need two files from your trained model:
- `model.json` - Model architecture and metadata
- `group1-shard1of1.bin` - Model weights (may be multiple shards for larger models)

These files are generated when you convert a Keras/TensorFlow model to TensorFlow.js format.

### 2. Add Model to Project

Create the models directory and add your files:

```bash
mkdir -p public/models/swift-parrot
```

Place your files in the directory:
```
public/
  models/
    swift-parrot/
      ├── model.json
      └── group1-shard1of1.bin
```

### 3. Test the Integration

Once your files are in place, the app will **automatically detect and use** the TensorFlow model instead of the mock model.

No code changes needed! The `ModelFactory` auto-detects if a model exists at `/models/swift-parrot/model.json`.

---

## How It Works

### Automatic Model Detection

When `SensorService` initializes, it calls `ModelFactory.autoDetectAndCreate()`:

```typescript
// From services/sensorService.ts
async initialize(): Promise<void> {
  this.detectionModel = await ModelFactory.autoDetectAndCreate(
    this.config.detectionThreshold
  );
  // ...
}
```

The factory checks if a TensorFlow model exists:
1. Tries to fetch `/models/swift-parrot/model.json`
2. If found → loads TensorFlow model
3. If not found → uses mock model

### Model Processing Pipeline

```
Audio Blob
    ↓
AudioPreprocessor.blobToAudioBuffer()
    ↓ (Converts to AudioBuffer at 22050 Hz)
AudioPreprocessor.extractMelSpectrogram()
    ↓ (Extracts 128x128 mel-spectrogram using Meyda.js)
TensorFlow.js Model
    ↓ (Runs inference)
Confidence Score (0.0 - 1.0)
```

---

## Model Requirements

Your TensorFlow.js model **must** match these specifications:

### Input Shape
```
[1, 128, 128, 1]
```
- Batch size: 1
- Time steps: 128 frames
- Mel bins: 128 frequency bands
- Channels: 1 (mono)

### Output Shape
```
[1, 1] or [1, 2]
```
- Single confidence score, OR
- [not_parrot_prob, parrot_prob]

### Audio Preprocessing
The app extracts mel-spectrograms with these settings:
```typescript
{
  sampleRate: 22050,      // 22.05 kHz
  frameSize: 2048,        // FFT window
  hopSize: 512,           // Overlap
  melBands: 128,          // Frequency bins
  targetFrames: 128       // Time frames
}
```

**CRITICAL**: Your training preprocessing must match these settings exactly!

---

## Custom Model Configuration

### Change Model Path

Edit `services/modelFactory.ts`:

```typescript
static async autoDetectAndCreate(threshold: number = 0.9) {
  const defaultModelPath = '/models/my-custom-model/model.json'; // Change this

  // ...
}
```

### Adjust Preprocessing Settings

Edit `services/audioPreprocessing.ts`:

```typescript
export const DEFAULT_SPECTROGRAM_CONFIG: SpectrogramConfig = {
  sampleRate: 22050,    // Match your training data
  frameSize: 2048,
  hopSize: 512,
  melBands: 128,        // Must match model input
  targetFrames: 128,    // Must match model input
};
```

### Force Specific Model Type

Instead of auto-detection, manually specify:

```typescript
// In services/sensorService.ts
async initialize(): Promise<void> {
  // Force TensorFlow model
  this.detectionModel = await ModelFactory.createModel({
    type: 'tensorflow',
    modelPath: '/models/swift-parrot/model.json',
    threshold: this.config.detectionThreshold
  });

  // OR force mock model
  this.detectionModel = await ModelFactory.createModel({
    type: 'mock',
    threshold: this.config.detectionThreshold
  });

  await this.storageService.initialize();
  this.updateStats();
}
```

---

## Testing Your Model

### 1. Check Model Loading

Open browser console and look for:
```
Loading TensorFlow.js model from /models/swift-parrot/model.json...
Model loaded successfully
Input shape: [null, 128, 128, 1]
Output shape: [null, 1]
```

### 2. Monitor Inference

Each detection logs:
```
Inference completed in 245ms, confidence: 0.873
```

### 3. Verify Model Name

In the Settings tab, check that the model name shows your TensorFlow model instead of "SwiftParrot_Mock_v1.0".

---

## Troubleshooting

### Model not loading

**Error**: `Failed to load TensorFlow.js model`

**Solutions**:
1. Check files exist at correct path
2. Verify `model.json` is valid JSON
3. Check browser console for CORS errors
4. Ensure weight files (.bin) are in same directory as model.json

### Wrong predictions

**Issue**: Model gives random/incorrect results

**Solutions**:
1. Verify preprocessing matches training exactly
2. Check audio sample rate (should be 22050 Hz)
3. Confirm input tensor shape matches model expectations
4. Test with known positive/negative samples

### Slow inference

**Issue**: Takes >2 seconds per prediction

**Solutions**:
1. Use WebGL backend: `tf.setBackend('webgl')`
2. Reduce model size (fewer layers/parameters)
3. Optimize model with quantization
4. Consider smaller input size (64x64 instead of 128x128)

### Memory leaks

**Issue**: Browser slows down over time

**Solution**: The model properly disposes tensors after each inference. If issues persist, check:
```typescript
// Tensors are disposed after use
inputTensor.dispose();
prediction.dispose();
```

---

## Advanced: Multiple Models

To support multiple models (e.g., different species):

### 1. Organize model files
```
public/
  models/
    swift-parrot/
      model.json
    orange-bellied-parrot/
      model.json
    ground-parrot/
      model.json
```

### 2. Update ModelFactory

Add model selection:
```typescript
static async createModelForSpecies(
  species: 'swift-parrot' | 'orange-bellied-parrot' | 'ground-parrot',
  threshold: number = 0.9
) {
  return await ModelFactory.createModel({
    type: 'tensorflow',
    modelPath: `/models/${species}/model.json`,
    threshold,
  });
}
```

---

## Performance Tips

1. **Enable WebGL**: TensorFlow.js runs 10-100x faster on GPU
2. **Batch processing**: Process multiple segments together
3. **Model quantization**: Use `int8` or `float16` weights
4. **Prune model**: Remove unnecessary layers
5. **Cache spectrograms**: Reuse feature extraction

---

## Next Steps

- See `MODEL_REQUIREMENTS.md` for training guide
- Test with Xeno-canto Swift Parrot recordings
- Monitor false positive rate in the Detections tab
- Adjust threshold based on field performance
