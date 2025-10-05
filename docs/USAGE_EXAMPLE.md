# Using BirdNET in Your App - Code Example

This guide shows you exactly how to modify your app to use BirdNET instead of the mock model.

## Current Behavior

By default, the app uses automatic model detection:

```typescript
// In services/sensorService.ts - current code
async initialize(): Promise<void> {
  this.detectionModel = await ModelFactory.autoDetectAndCreate(
    this.config.detectionThreshold
  );
  await this.storageService.initialize();
  this.updateStats();
}
```

This checks for a TensorFlow model first, then falls back to the mock model.

## Option 1: Force BirdNET Model (Recommended)

Modify `services/sensorService.ts` to always use BirdNET:

```typescript
// In services/sensorService.ts
async initialize(): Promise<void> {
  // Replace the autoDetectAndCreate line with this:
  this.detectionModel = await ModelFactory.createBirdNETModel(
    this.config.detectionThreshold
  );

  await this.storageService.initialize();
  this.updateStats();
}
```

**That's it!** Now the app will always use BirdNET.

---

## Option 2: Add Model Selection to Settings

Let users choose which model to use.

### Step 1: Add Settings Option

Modify `app/(tabs)/settings.tsx`:

```typescript
// Add this state
const [modelType, setModelType] = useState<'mock' | 'tensorflow' | 'birdnet'>('mock');

// Load model type from storage
useEffect(() => {
  const loadModelType = async () => {
    const saved = await AsyncStorage.getItem('model_type');
    if (saved) setModelType(saved as any);
  };
  loadModelType();
}, []);

// Save when changed
const saveModelType = async (type: 'mock' | 'tensorflow' | 'birdnet') => {
  setModelType(type);
  await AsyncStorage.setItem('model_type', type);
};

// Add to your settings UI
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Detection Model</Text>

  <TouchableOpacity
    style={[styles.modelOption, modelType === 'mock' && styles.modelOptionActive]}
    onPress={() => saveModelType('mock')}
  >
    <Text style={styles.optionText}>Mock Model (Testing)</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.modelOption, modelType === 'birdnet' && styles.modelOptionActive]}
    onPress={() => saveModelType('birdnet')}
  >
    <Text style={styles.optionText}>BirdNET (Production)</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.modelOption, modelType === 'tensorflow' && styles.modelOptionActive]}
    onPress={() => saveModelType('tensorflow')}
  >
    <Text style={styles.optionText}>TensorFlow.js (Custom)</Text>
  </TouchableOpacity>
</View>
```

### Step 2: Use Selected Model

Modify `app/(tabs)/index.tsx`:

```typescript
const initializeSensor = async () => {
  try {
    // ... existing device ID code ...

    // Load model type preference
    const modelType = await AsyncStorage.getItem('model_type') || 'mock';

    const sensor = new SensorService(
      {
        deviceId: id,
        segmentDuration: 5000,
        detectionThreshold: threshold ? parseFloat(threshold) : 0.9,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      },
      setStats
    );

    // Create the selected model
    let model;
    if (modelType === 'birdnet') {
      model = await ModelFactory.createBirdNETModel(0.9);
    } else if (modelType === 'tensorflow') {
      model = await ModelFactory.createModel({
        type: 'tensorflow',
        modelPath: '/models/swift-parrot/model.json',
        threshold: 0.9,
      });
    } else {
      model = await ModelFactory.createModel({
        type: 'mock',
        threshold: 0.9,
      });
    }

    // Set the model before storage initialization
    sensor['detectionModel'] = model;
    await sensor['storageService'].initialize();
    sensor['updateStats']();

    sensorServiceRef.current = sensor;
    setIsInitialized(true);
  } catch (error) {
    console.error('Failed to initialize sensor:', error);
  }
};
```

---

## Option 3: Environment-Based Selection

Use different models for development vs production.

Create `.env.local` (for development):
```
EXPO_PUBLIC_MODEL_TYPE=mock
```

Create `.env.production` (for production):
```
EXPO_PUBLIC_MODEL_TYPE=birdnet
```

Then in `services/sensorService.ts`:

```typescript
async initialize(): Promise<void> {
  const modelType = process.env.EXPO_PUBLIC_MODEL_TYPE || 'mock';

  if (modelType === 'birdnet') {
    this.detectionModel = await ModelFactory.createBirdNETModel(
      this.config.detectionThreshold
    );
  } else if (modelType === 'tensorflow') {
    this.detectionModel = await ModelFactory.createModel({
      type: 'tensorflow',
      modelPath: '/models/swift-parrot/model.json',
      threshold: this.config.detectionThreshold,
    });
  } else {
    this.detectionModel = await ModelFactory.createModel({
      type: 'mock',
      threshold: this.config.detectionThreshold,
    });
  }

  await this.storageService.initialize();
  this.updateStats();
}
```

---

## Testing Your Changes

### 1. Start BirdNET Server

```bash
cd /path/to/BirdNET-Analyzer
python server.py --host 0.0.0.0 --port 8080
```

### 2. Deploy Edge Function

The edge function should already be deployed. If not:

```bash
# The function is at: supabase/functions/analyze-birdcall/index.ts
# It will be deployed automatically when you use it
```

### 3. Restart Your App

```bash
npm run dev
```

### 4. Test with Recording

1. Go to Home tab
2. Click "Start Monitoring"
3. Play a Swift Parrot recording from:
   - [Xeno-canto Recording #753251](https://xeno-canto.org/753251)
   - Or download any Swift Parrot call

### 5. Check Console

You should see:
```
Creating BirdNET detection model
BirdNET model initialized
Edge function URL: https://YOUR-PROJECT.supabase.co/functions/v1/analyze-birdcall
Sending audio to BirdNET edge function...
BirdNET analysis completed in 1523ms, confidence: 0.891
Swift Parrot detected! Species: Swift Parrot
```

### 6. View Detection

Go to Detections tab - you should see the detection with:
- Timestamp
- Confidence score
- Model name: "BirdNET"

---

## Debugging

### BirdNET Server Not Running

**Error:**
```
BirdNET analysis failed: BirdNET edge function returned 500
```

**Solution:**
```bash
# Check BirdNET is running
curl http://localhost:8080/health

# If not running, start it:
cd /path/to/BirdNET-Analyzer
python server.py --host 0.0.0.0 --port 8080
```

### Edge Function Error

**Error:**
```
Failed to fetch edge function
```

**Solutions:**
1. Check Supabase URL and anon key in `.env`
2. Verify edge function is deployed
3. Check browser console for CORS errors
4. Test edge function directly:
   ```bash
   curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/analyze-birdcall \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: multipart/form-data" \
     -F "audio=@test.wav"
   ```

### No Swift Parrot Detected

**Issue:** BirdNET returns results but no Swift Parrot found

**Solutions:**
1. Check `allDetections` in response - what species did it detect?
2. Lower threshold to see if Swift Parrot is detected with lower confidence
3. Ensure test audio actually contains Swift Parrot calls
4. Try a different Swift Parrot recording

---

## Complete Example

Here's a complete `initializeSensor` function with BirdNET:

```typescript
const initializeSensor = async () => {
  try {
    // Get or create device ID
    let id = await AsyncStorage.getItem('device_id');
    if (!id) {
      id = `sensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('device_id', id);
    }
    setDeviceId(id);

    // Load settings
    const latitude = await AsyncStorage.getItem('latitude');
    const longitude = await AsyncStorage.getItem('longitude');
    const threshold = await AsyncStorage.getItem('threshold');

    // Create sensor service
    const sensor = new SensorService(
      {
        deviceId: id,
        segmentDuration: 5000,
        detectionThreshold: threshold ? parseFloat(threshold) : 0.9,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      },
      setStats
    );

    // Create BirdNET model
    console.log('Initializing BirdNET model...');
    const model = await ModelFactory.createBirdNETModel(
      threshold ? parseFloat(threshold) : 0.9
    );

    // Assign model and initialize storage
    sensor['detectionModel'] = model;
    await sensor['storageService'].initialize();
    sensor['updateStats']();

    sensorServiceRef.current = sensor;
    setIsInitialized(true);

    console.log('Sensor initialized with BirdNET model');
  } catch (error) {
    console.error('Failed to initialize sensor:', error);
    alert('Failed to initialize sensor. Check console for details.');
  }
};
```

---

## Next Steps

1. Choose your implementation approach (Option 1, 2, or 3)
2. Make the code changes
3. Start BirdNET server
4. Test with real Swift Parrot recordings
5. Monitor performance and adjust threshold as needed

---

## Questions?

- **BirdNET setup issues?** → See `docs/BIRDNET_SETUP.md`
- **Want to compare models?** → See `docs/MODEL_COMPARISON.md`
- **Training custom model?** → See `docs/MODEL_REQUIREMENTS.md`
