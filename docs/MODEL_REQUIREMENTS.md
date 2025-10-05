# TensorFlow.js Model Requirements for Swift Parrot Detection

## Model Specifications

### Input Format

Your TensorFlow.js model should accept **audio features** as input, typically a mel-spectrogram:

```
Input Shape: [1, time_steps, mel_bins, 1]
Example: [1, 128, 128, 1]
```

- **time_steps**: Number of time frames (e.g., 128 for ~5 seconds at 25 fps)
- **mel_bins**: Number of mel-frequency bins (typically 64, 128, or 256)
- **channels**: 1 (mono audio)

### Output Format

```
Output Shape: [1, 1] or [1, 2]
Values: [confidence_score] or [not_parrot_prob, parrot_prob]
```

Should return a **single confidence score** between 0.0 and 1.0 indicating the probability that the audio contains a Swift Parrot call.

### Model Architecture Suggestions

**Option 1: CNN-based classifier**
```
Input (128x128x1)
  ↓
Conv2D (32 filters, 3x3) + ReLU + MaxPool
  ↓
Conv2D (64 filters, 3x3) + ReLU + MaxPool
  ↓
Conv2D (128 filters, 3x3) + ReLU + MaxPool
  ↓
Flatten
  ↓
Dense (128) + Dropout(0.5)
  ↓
Dense (1, sigmoid) → Confidence score
```

**Option 2: Transfer learning**
- Use pre-trained YAMNet or VGGish embeddings
- Add classification head for Swift Parrot detection
- Fine-tune on your dataset

---

## Training the Model

### Step 1: Collect Data

You need labeled audio recordings:

**Positive Examples (Swift Parrot calls)**:
- 500+ recordings of confirmed Swift Parrot vocalizations
- Various call types: contact calls, alarm calls, feeding calls
- Different recording conditions
- Sources:
  - [Xeno-canto](https://xeno-canto.org/species/Lathamus-discolor) - Free bird sound database
  - Your own field recordings
  - BirdLife Tasmania recordings

**Negative Examples (Background/Other species)**:
- 1000+ recordings of:
  - Other Tasmanian bird species
  - Forest ambient sounds
  - Wind, rain, rustling leaves
  - Human voices, vehicles (if relevant)

### Step 2: Preprocessing

Convert audio to spectrograms using Python:

```python
import librosa
import numpy as np

def audio_to_melspectrogram(audio_file, duration=5.0):
    """
    Convert audio file to mel-spectrogram
    """
    # Load audio (resample to 22050 Hz)
    y, sr = librosa.load(audio_file, sr=22050, duration=duration)

    # Generate mel-spectrogram
    mel_spec = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_fft=2048,
        hop_length=512,
        n_mels=128,
        fmin=1000,  # Swift Parrots vocalize 1-10 kHz
        fmax=10000
    )

    # Convert to log scale (dB)
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

    # Normalize to [0, 1]
    mel_spec_norm = (mel_spec_db - mel_spec_db.min()) / (mel_spec_db.max() - mel_spec_db.min())

    return mel_spec_norm
```

### Step 3: Train Model in Python

```python
import tensorflow as tf
from tensorflow.keras import layers, models

# Build model
model = models.Sequential([
    layers.Input(shape=(128, 128, 1)),

    layers.Conv2D(32, (3, 3), activation='relu'),
    layers.MaxPooling2D((2, 2)),
    layers.BatchNormalization(),

    layers.Conv2D(64, (3, 3), activation='relu'),
    layers.MaxPooling2D((2, 2)),
    layers.BatchNormalization(),

    layers.Conv2D(128, (3, 3), activation='relu'),
    layers.MaxPooling2D((2, 2)),
    layers.BatchNormalization(),

    layers.Flatten(),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.5),
    layers.Dense(1, activation='sigmoid')
])

# Compile
model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy', 'precision', 'recall']
)

# Train
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=50,
    batch_size=32,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(patience=10),
        tf.keras.callbacks.ModelCheckpoint('best_model.h5')
    ]
)
```

### Step 4: Convert to TensorFlow.js

```bash
# Install tensorflowjs converter
pip install tensorflowjs

# Convert Keras model to TF.js format
tensorflowjs_converter \
    --input_format=keras \
    best_model.h5 \
    ./tfjs_model
```

This creates:
- `model.json` - Model architecture and weights manifest
- `group1-shard1of1.bin` - Model weights (binary)

---

## Alternative: Use Pre-built Tools

### Google's AudioSet Models

Use **YAMNet** (pre-trained audio classifier):

```javascript
import * as tf from '@tensorflow/tfjs';

// Load YAMNet
const model = await tf.loadGraphModel(
  'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1',
  { fromTFHub: true }
);

// Get embeddings for your audio
// Then train a small classifier on top
```

### BirdNET

**BirdNET** is a pre-trained bird sound recognition model:
- Already trained on 3000+ bird species
- May include Swift Parrot
- Can be adapted for your use case

GitHub: https://github.com/kahst/BirdNET-Analyzer

You'd need to:
1. Export BirdNET to TensorFlow.js format (requires custom work)
2. Or run BirdNET on server and call via API

---

## Integration Steps

Once you have your `model.json` and weight files:

### 1. Add model files to your project

```
project/
  public/
    models/
      swift-parrot/
        model.json
        group1-shard1of1.bin
```

### 2. Install TensorFlow.js

```bash
npm install @tensorflow/tfjs
```

### 3. Create production model service

Create `services/detectionModelProduction.ts`:

```typescript
import * as tf from '@tensorflow/tfjs';

export class SwiftParrotDetectionModel {
  private model: tf.LayersModel | null = null;
  private threshold: number;
  private readonly MODEL_PATH = '/models/swift-parrot/model.json';

  constructor(threshold: number = 0.9) {
    this.threshold = threshold;
  }

  async initialize(): Promise<void> {
    console.log('Loading Swift Parrot detection model...');
    this.model = await tf.loadLayersModel(this.MODEL_PATH);
    console.log('Model loaded successfully');
  }

  async analyzeAudio(audioBlob: Blob): Promise<DetectionResult> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    // 1. Decode audio blob
    const audioBuffer = await this.blobToAudioBuffer(audioBlob);

    // 2. Extract mel-spectrogram
    const melSpec = await this.extractMelSpectrogram(audioBuffer);

    // 3. Prepare tensor
    const inputTensor = tf.tensor4d(melSpec, [1, 128, 128, 1]);

    // 4. Run inference
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const confidence = (await prediction.data())[0];

    // 5. Cleanup
    inputTensor.dispose();
    prediction.dispose();

    return {
      confidence,
      modelName: 'SwiftParrot_CNN_v1.0',
      isPositive: confidence >= this.threshold,
    };
  }

  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 22050 });
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  private async extractMelSpectrogram(audioBuffer: AudioBuffer): Promise<number[][][][]> {
    // Get mono channel data
    const channelData = audioBuffer.getChannelData(0);

    // Use Web Audio API or a library like meyda.js
    // This is a simplified example - you'll need proper STFT and mel-filtering

    // For production, consider using a library like:
    // - @tensorflow/tfjs-audio (if available)
    // - meyda.js for feature extraction
    // - essentia.js for advanced audio analysis

    // Placeholder: You need to implement proper mel-spectrogram extraction
    // matching your Python preprocessing exactly

    throw new Error('Implement mel-spectrogram extraction');
  }

  setThreshold(threshold: number): void {
    this.threshold = Math.min(1.0, Math.max(0.0, threshold));
  }

  getThreshold(): number {
    return this.threshold;
  }

  getModelName(): string {
    return 'SwiftParrot_CNN_v1.0';
  }
}

export interface DetectionResult {
  confidence: number;
  modelName: string;
  isPositive: boolean;
}
```

### 4. Implement mel-spectrogram extraction

The hardest part is converting web audio to spectrograms in real-time. Options:

**Option A: Use Meyda.js** (recommended)
```bash
npm install meyda
```

```typescript
import Meyda from 'meyda';

private extractMelSpectrogram(audioBuffer: AudioBuffer): number[][][][] {
  const channelData = audioBuffer.getChannelData(0);
  const frameSize = 2048;
  const hopSize = 512;

  const spectrograms = [];

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    const features = Meyda.extract('melBands', frame, {
      melBands: 128,
      sampleRate: audioBuffer.sampleRate
    });
    spectrograms.push(features);
  }

  // Reshape and normalize to match training data
  return this.reshapeSpectrogram(spectrograms);
}
```

**Option B: Server-side processing**
- Send audio to edge function
- Process with Python/librosa
- Return spectrogram
- Run model in browser

### 5. Update your sensorService

```typescript
// In services/sensorService.ts
import { SwiftParrotDetectionModel } from './detectionModelProduction';
```

Replace the import and you're done!

---

## Model Performance Guidelines

For deployment in remote sensors:

- **Accuracy**: Aim for >90% accuracy on validation set
- **Precision**: >85% (minimize false positives - expensive to investigate)
- **Recall**: >90% (don't miss real detections)
- **Inference time**: <500ms per 5-second segment
- **Model size**: <5MB for web deployment

---

## Testing Your Model

Before deployment:

1. **Validate on test set**: Test on recordings the model hasn't seen
2. **Test false positive rate**: Run on hours of background forest sounds
3. **Test in field conditions**: Try with wind, rain, overlapping calls
4. **A/B test**: Compare against existing detection methods

---

## Resources

### Datasets
- **Xeno-canto**: https://xeno-canto.org/species/Lathamus-discolor
- **Macaulay Library**: https://www.macaulaylibrary.org/
- **eBird**: Audio recordings with verified IDs

### Tools
- **Audacity**: Audio labeling and preprocessing
- **Raven Pro**: Bioacoustic analysis software
- **Sonic Visualiser**: Spectrogram visualization

### Papers
- "BirdNET: A deep learning solution for avian diversity monitoring" (2021)
- "Large-scale bird sound classification using convolutional neural networks" (2020)
- "Automated birdsong recognition in complex acoustic environments" (2018)

### Libraries
- **librosa**: Audio feature extraction (Python)
- **Meyda.js**: Web Audio feature extraction
- **Essentia.js**: Advanced audio analysis for web
- **TensorFlow.js**: Browser ML inference

---

## Quick Start: Use BirdNET

The fastest path is to use **BirdNET-Lite**:

```bash
# Clone BirdNET
git clone https://github.com/kahst/BirdNET-Analyzer

# Run server
python server.py --host 0.0.0.0 --port 8080

# Call from your app via edge function
```

Then create an edge function to call BirdNET and return results.

---

## Need Help?

If you want to train a model but don't have ML experience:

1. Collect 200+ Swift Parrot recordings from Xeno-canto
2. Use **Teachable Machine** (Google) - no code ML training
3. Export as TensorFlow.js
4. Drop into your app

Link: https://teachablemachine.withgoogle.com/train/audio
