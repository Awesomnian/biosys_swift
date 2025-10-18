/**
 * SensorService - Main Orchestration Layer
 */

import { AudioCaptureService, AudioSegment } from './audioCapture';
import { DetectionResult } from './detectionModel';
import { ModelFactory } from './modelFactory';
import { StorageService } from './storageService';
import { LocationService } from './locationService';
import { Detection } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

export interface SensorConfig {
  deviceId: string;
  segmentDuration: number;
  detectionThreshold: number;
  latitude?: number;
  longitude?: number;
}

export interface SensorStats {
  isRunning: boolean;
  totalSegmentsProcessed: number;
  totalDetections: number;
  pendingUploads: number;
  lastDetection?: Date;
  currentConfidence?: number;
  consecutiveErrors?: number;
  lastError?: string;
}

export class SensorService {
  private audioCapture: AudioCaptureService;
  private detectionModel: any = null;
  private storageService: StorageService;
  private locationService: LocationService;
  private config: SensorConfig;
  private stats: SensorStats;
  private onStatsUpdate?: (stats: SensorStats) => void;

  private consecutiveErrors: number = 0;
  private lastErrorTime: number = 0;
  private errorCooldown: number = 30000;

  constructor(config: SensorConfig, onStatsUpdate?: (stats: SensorStats) => void) {
    this.config = config;
    this.onStatsUpdate = onStatsUpdate;

    this.stats = {
      isRunning: false,
      totalSegmentsProcessed: 0,
      totalDetections: 0,
      pendingUploads: 0,
      consecutiveErrors: 0,
    };

    this.audioCapture = new AudioCaptureService(
      config.segmentDuration,
      this.handleAudioSegment.bind(this)
    );

    this.storageService = new StorageService();
    this.locationService = new LocationService();
  }

  async initialize(): Promise<void> {
    console.log('🔧 SensorService.initialize() START');
    
    try {
      console.log('  📦 Step 1: Creating detection model via ModelFactory...');
      console.log('    - Threshold:', this.config.detectionThreshold);
      
      this.detectionModel = await ModelFactory.autoDetectAndCreate(
        this.config.detectionThreshold
      );
      
      console.log('  ✅ Step 1 complete: Model created');
      console.log('    - Model type:', this.detectionModel?.constructor?.name || 'unknown');

      console.log('  📦 Step 2: Initializing storage service...');
      await this.storageService.initialize();
      console.log('  ✅ Step 2 complete: Storage initialized');

      console.log('  📦 Step 3: Assuming location permission...');
      this.locationService.requestPermission();
      console.log('  ✅ Step 3 complete: Location permission assumed');

      console.log('  📦 Step 4: Updating stats...');
      this.updateStats();
      console.log('  ✅ Step 4 complete: Stats updated');

      console.log('✅ SensorService.initialize() COMPLETE');
    } catch (error) {
      console.error('❌ SensorService.initialize() FAILED:', error);
      console.error('  Error type:', typeof error);
      console.error('  Error message:', error instanceof Error ? error.message : String(error));
      console.error('  Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async start(): Promise<void> {
    console.log('🔧 SensorService.start() CALLED');
    console.log('  📊 Current isRunning:', this.stats.isRunning);
    
    if (this.stats.isRunning) {
      console.log('  ⚠️ Already running, returning early');
      return;
    }

    console.log('  🔧 Resetting error counters...');
    this.consecutiveErrors = 0;
    this.stats.consecutiveErrors = 0;
    this.stats.lastError = undefined;
    console.log('  ✅ Error counters reset');

    console.log('  📍 Step 1: Starting GPS tracking...');
    try {
      await this.locationService.startTracking();
      console.log('  ✅ GPS tracking started');
    } catch (gpsError) {
      console.warn('  ⚠️ GPS tracking failed:', gpsError);
    }

    console.log('  🎤 Step 2: Starting audio capture...');
    try {
      await this.audioCapture.start();
      console.log('  ✅ Audio capture started');
    } catch (audioError) {
      console.error('  ❌ Audio capture failed:', audioError);
      throw audioError;
    }

    console.log('  🔧 Setting isRunning = true...');
    this.stats.isRunning = true;
    console.log('  🔧 Calling updateStats()...');
    this.updateStats();
    console.log('  ✅ updateStats() complete');

    console.log('✅ SensorService.start() COMPLETE - Monitoring active!');
  }

  stop(): void {
    this.audioCapture.stop();
    this.stats.isRunning = false;
    this.updateStats();
  }

  private async handleAudioSegment(segment: AudioSegment): Promise<void> {
    if (!this.detectionModel) {
      console.error('Detection model not initialized');
      return;
    }

    try {
      const result = await this.detectionModel.analyzeAudio(segment.uri);

      this.consecutiveErrors = 0;
      this.stats.consecutiveErrors = 0;
      this.stats.lastError = undefined;

      this.stats.totalSegmentsProcessed++;
      this.stats.currentConfidence = result.confidence;

      if (result.isPositive) {
        await this.handleDetection(segment, result);
      } else {
        // Check for "possible" detections (50-80% confidence)
        if (result.confidence >= 0.5 && result.confidence < this.config.detectionThreshold) {
          const location = await this.locationService.getCurrentLocation();
          const lat = location?.latitude || this.config.latitude || 0;
          const lon = location?.longitude || this.config.longitude || 0;
          const timestamp = segment.timestamp.toLocaleString();
          console.log(`🤔 POSSIBLE: ${result.species || 'Unknown'} (${(result.confidence * 100).toFixed(1)}%) @ ${lat.toFixed(4)},${lon.toFixed(4)} on ${timestamp}`);
        }
        
        await FileSystem.deleteAsync(segment.uri, { idempotent: true });
        console.log('🗑️ No detection - deleted audio file');
      }

      this.updateStats();

    } catch (error) {
      this.consecutiveErrors++;
      this.stats.consecutiveErrors = this.consecutiveErrors;

      if (this.consecutiveErrors >= 5) {
        console.error('Too many consecutive errors, stopping monitoring');
        this.stop();
        this.stats.lastError = 'Monitoring stopped after 5 consecutive failures. Check BirdNET server connection and try again.';
        this.updateStats();
        return;
      }

      const now = Date.now();
      if (now - this.lastErrorTime > this.errorCooldown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
          this.stats.lastError = 'BirdNET server unreachable. Check server configuration.';
        } else {
          // If BirdNET proxy returned a format error (e.g. 500 "Format not recognised."),
          // preserve the audio and queue it for deferred server-side analysis via StorageService.
          if (errorMessage.toLowerCase().includes('format not recognised') || errorMessage.toLowerCase().includes('format not recognized') || errorMessage.toLowerCase().includes('proxy returned status 500')) {
            try {
              console.warn('BirdNET format error detected — deferring analysis by saving audio for server-side processing');
              const location = await this.locationService.getCurrentLocation();
              const metadata = {
                device_id: this.config.deviceId,
                timestamp: new Date().toISOString(),
                latitude: location?.latitude || this.config.latitude,
                longitude: location?.longitude || this.config.longitude,
                model_name: 'BirdNET-Deferred',
                confidence: 0,
              } as any;

              await this.storageService.saveDetection(segment.uri, metadata);
              this.stats.lastError = 'Analysis deferred to server due to audio format mismatch. Audio queued for upload.';
              this.lastErrorTime = now;
              this.updateStats();
              return; // do not delete the file here — storageService will handle cleanup after upload
            } catch (saveErr) {
              console.error('Failed to defer analysis and save audio:', saveErr);
              this.stats.lastError = 'Analysis error: ' + errorMessage.substring(0, 100);
            }
          } else {
            this.stats.lastError = 'Analysis error: ' + errorMessage.substring(0, 100);
          }
        }

        console.error('Error processing audio segment:', error);
        this.lastErrorTime = now;
        this.updateStats();
      }
      
      // Delete the audio segment unless we've already deferred it to storageService above.
      try {
        await FileSystem.deleteAsync(segment.uri, { idempotent: true });
        console.log('\ud83d\uddd1\ufe0f Deleted temporary audio segment');
      } catch (delErr) {
        console.warn('Failed to delete temporary audio segment:', delErr);
      }
    }
  }

  private async handleDetection(
    segment: AudioSegment,
    result: DetectionResult
  ): Promise<void> {
    this.stats.totalDetections++;
    this.stats.lastDetection = segment.timestamp;

    const location = await this.locationService.getCurrentLocation();

    const metadata: Omit<Detection, 'id' | 'audio_file_url'> = {
      device_id: this.config.deviceId,
      timestamp: segment.timestamp.toISOString(),
      latitude: location?.latitude || this.config.latitude,
      longitude: location?.longitude || this.config.longitude,
      model_name: result.modelName,
      confidence: result.confidence,
    };

    await this.storageService.saveDetection(segment.uri, metadata);
    this.updateStats();
  }

  async syncData(): Promise<void> {
    await this.storageService.attemptUpload();
    this.updateStats();
  }

  private updateStats(): void {
    this.stats.pendingUploads = this.storageService.getPendingCount();

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  getStats(): SensorStats {
    return { ...this.stats };
  }

  updateConfig(config: Partial<SensorConfig>): void {
    if (config.detectionThreshold !== undefined && this.detectionModel) {
      this.detectionModel.setThreshold(config.detectionThreshold);
      this.config.detectionThreshold = config.detectionThreshold;
    }

    if (config.latitude !== undefined) {
      this.config.latitude = config.latitude;
    }

    if (config.longitude !== undefined) {
      this.config.longitude = config.longitude;
    }
  }

  getModelName(): string {
    return this.detectionModel?.getModelName() || 'Unknown';
  }
}