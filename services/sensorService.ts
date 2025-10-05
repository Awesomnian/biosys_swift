import { AudioCaptureService, AudioSegment } from './audioCapture';
import { DetectionResult } from './detectionModel';
import { ModelFactory } from './modelFactory';
import { StorageService } from './storageService';
import { LocationService } from './locationService';
import { Detection } from '../lib/supabase';

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
}

export class SensorService {
  private audioCapture: AudioCaptureService;
  private detectionModel: any = null;
  private storageService: StorageService;
  private locationService: LocationService;
  private config: SensorConfig;
  private stats: SensorStats;
  private onStatsUpdate?: (stats: SensorStats) => void;

  constructor(config: SensorConfig, onStatsUpdate?: (stats: SensorStats) => void) {
    this.config = config;
    this.onStatsUpdate = onStatsUpdate;

    this.stats = {
      isRunning: false,
      totalSegmentsProcessed: 0,
      totalDetections: 0,
      pendingUploads: 0,
    };

    this.audioCapture = new AudioCaptureService(
      config.segmentDuration,
      this.handleAudioSegment.bind(this)
    );

    this.storageService = new StorageService();
    this.locationService = new LocationService();
  }

  async initialize(): Promise<void> {
    this.detectionModel = await ModelFactory.autoDetectAndCreate(
      this.config.detectionThreshold
    );
    await this.storageService.initialize();
    await this.locationService.requestPermission();
    this.updateStats();
  }

  async start(): Promise<void> {
    if (this.stats.isRunning) {
      return;
    }

    await this.locationService.startTracking();
    await this.audioCapture.start();
    this.stats.isRunning = true;
    this.updateStats();
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
      const result = await this.detectionModel.analyzeAudio(segment.blob);

      this.stats.totalSegmentsProcessed++;
      this.stats.currentConfidence = result.confidence;

      if (result.isPositive) {
        await this.handleDetection(segment, result);
      }

      this.updateStats();
    } catch (error) {
      console.error('Error processing audio segment:', error);
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

    await this.storageService.saveDetection(segment.blob, metadata);
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
