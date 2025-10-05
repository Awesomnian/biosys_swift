import { AudioCaptureService, AudioSegment } from './audioCapture';
import { SwiftParrotDetectionModel, DetectionResult } from './detectionModel';
import { StorageService } from './storageService';
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
  private detectionModel: SwiftParrotDetectionModel;
  private storageService: StorageService;
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

    this.detectionModel = new SwiftParrotDetectionModel(config.detectionThreshold);
    this.storageService = new StorageService();
  }

  async initialize(): Promise<void> {
    await this.detectionModel.initialize();
    await this.storageService.initialize();
    this.updateStats();
  }

  async start(): Promise<void> {
    if (this.stats.isRunning) {
      return;
    }

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

    const metadata: Omit<Detection, 'id' | 'audio_file_url'> = {
      device_id: this.config.deviceId,
      timestamp: segment.timestamp.toISOString(),
      latitude: this.config.latitude,
      longitude: this.config.longitude,
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
    if (config.detectionThreshold !== undefined) {
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
}
