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

2. **Mock AI Model (Default)**: Uses a simulated detection model that generates random confidence scores
   - Can be replaced with BirdNET (30 min setup) or custom TensorFlow.js model
   - See [Detection Models](#detection-models) section below for options

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

## Detection Models

The app now supports **three detection models**:

| Model | Best For | Setup Time |
|-------|----------|------------|
| **Mock** | Testing UI | 0 min (default) |
| **BirdNET** | Production use | 30 min |
| **TensorFlow.js** | Custom training | 1-2 weeks |

### Getting Started with Models

**Quick Start:**
- 📖 **[Model Documentation](docs/README_MODELS.md)** - Complete guide to all models
- 🚀 **[BirdNET Setup](docs/BIRDNET_SETUP.md)** - Use pre-trained model (recommended)
- 🔧 **[TensorFlow.js Setup](docs/TENSORFLOW_SETUP.md)** - Train your own model
- 💡 **[Usage Examples](docs/USAGE_EXAMPLE.md)** - Code examples

**Recommended Path:**
1. Start with **Mock Model** to test the UI
2. Deploy **BirdNET** for real detection (30 min setup)
3. Optional: Train **custom TensorFlow.js** model for offline use

See [docs/README_MODELS.md](docs/README_MODELS.md) for complete details.

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
