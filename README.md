# Tarkine Ears - Swift Parrot Bioacoustic Sensor

**Version 1.0 - Proof of Concept**

A web-based prototype demonstrating bioacoustic monitoring for detecting endangered Swift Parrot (*Lathamus discolor*) calls using on-device AI analysis.

## Overview

This proof-of-concept application demonstrates the core functionality of a bioacoustic sensor system:

- **Continuous audio capture** from the device microphone
- **On-device AI detection** using a mock TensorFlow model
- **Local data persistence** with automatic cloud synchronization
- **Real-time monitoring** dashboard with detection history
- **Offline-first architecture** for remote deployment scenarios

## Important Limitations

⚠️ **This is a web-based proof of concept**, not a production-ready sensor system.

### Key Constraints

1. **Web Platform Only**: This app runs in a web browser and cannot:
   - Run as a background service when the browser is closed
   - Auto-restart on device reboot
   - Operate continuously for weeks/months unattended
   - Optimize power consumption like native apps

2. **Mock AI Model**: Uses a simulated detection model that generates random confidence scores
   - Replace with real TensorFlow.js model for actual deployment
   - Current model randomly triggers detections for demonstration purposes

3. **Microphone Access**: Requires active browser window with granted permissions
   - Audio capture stops when tab is inactive (browser limitation)
   - Not suitable for true remote deployment

## For Production Deployment

To build a real bioacoustic sensor, you need:

- **Native Android Application** (Kotlin/Java)
- **Android Background Services** for continuous operation
- **TensorFlow Lite** for efficient on-device inference
- **WorkManager** for robust background tasks
- **Power optimization** strategies for extended battery life

## Features Implemented

### ✅ Core Functionality

- Audio capture in 5-second segments
- Mock AI analysis with configurable confidence threshold
- Detection metadata logging (timestamp, GPS, confidence)
- Local storage with upload queue
- Automatic sync when online
- Detection history viewer

### ✅ User Interface

- **Monitor Tab**: Real-time status, statistics, and controls
- **Detections Tab**: History of all positive detections
- **Settings Tab**: Configure device ID, location, and thresholds

### ✅ Backend Integration

- Supabase database for detection metadata
- Supabase Storage for audio files
- Row Level Security policies configured

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase project with environment variables configured

### Installation

```bash
npm install
```

### Configuration

Ensure your `.env` file contains:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Running the App

```bash
npm run dev
```

Then open the app in your browser and:

1. Grant microphone permissions when prompted
2. Configure location in Settings tab (optional)
3. Adjust detection threshold (default: 0.9)
4. Start monitoring from the Monitor tab

## Architecture

### Services

- **AudioCaptureService**: Manages microphone access and segmentation
- **SwiftParrotDetectionModel**: Mock AI model for call detection
- **StorageService**: Handles local persistence and upload queue
- **SensorService**: Coordinates all components

### Data Flow

```
Microphone → Audio Segments → AI Model → Detection?
                                            ↓ Yes
                                    Save Locally
                                            ↓
                                    Upload Queue
                                            ↓
                                    Supabase (when online)
```

### Database Schema

**detections** table:
- device_id, timestamp, latitude, longitude
- model_name, confidence
- audio_file_url (Supabase Storage)

**sensor_status** table:
- device_id, last_seen, battery_level
- storage_used_mb, total_detections, status

## Integrating a Real AI Model

To use an actual TensorFlow.js model:

1. Train or obtain a TensorFlow model for Swift Parrot calls
2. Convert to TensorFlow.js format
3. Replace `services/detectionModel.ts`:

```typescript
import * as tf from '@tensorflow/tfjs';

export class SwiftParrotDetectionModel {
  private model: tf.LayersModel;

  async initialize() {
    this.model = await tf.loadLayersModel('/path/to/model.json');
  }

  async analyzeAudio(audioBlob: Blob) {
    // Convert audio to mel-spectrogram
    // Run inference
    // Return confidence score
  }
}
```

## Storage Bucket Setup

The application requires a Supabase storage bucket named `audio-detections`. SQL setup scripts are provided in `scripts/setup-storage.sql`.

## Future Enhancements

- Integration with real TensorFlow.js audio model
- Audio visualization (waveform/spectrogram)
- Export detection data as CSV
- Multi-species detection support
- Battery level monitoring
- Network status indicators

## Conservation Context

The Swift Parrot is critically endangered, with fewer than 2,000 individuals remaining. Bioacoustic monitoring provides non-invasive, continuous data collection to support conservation efforts in Tasmania's Tarkine/takayna forest.

## License

Research prototype for conservation purposes.
