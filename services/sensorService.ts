/**
 * SensorService - Main Orchestration Layer
 *
 * This service coordinates all components of the bioacoustic monitoring system:
 * - Audio capture (continuous 5-second segments)
 * - ML analysis via BirdNET
 * - Detection storage and synchronization
 * - GPS location tracking
 * - Error handling and recovery
 *
 * WORKFLOW:
 * 1. User starts monitoring → start() called
 * 2. Audio capture begins (5-second segments)
 * 3. Each segment sent to handleAudioSegment()
 * 4. Segment analyzed by BirdNET
 * 5. If Swift Parrot detected (confidence ≥ threshold):
 *    - Get GPS coordinates
 *    - Save audio + metadata to Supabase
 *    - Update statistics
 * 6. If error occurs:
 *    - Increment error counter
 *    - After 5 consecutive errors → auto-stop monitoring
 *
 * ERROR RECOVERY:
 * - Automatically stops monitoring after 5 consecutive API failures
 * - Prevents infinite error loops and battery drain
 * - Errors reset when monitoring successfully restarts
 * - Error messages shown max once per 30 seconds (prevents spam)
 */

import { AudioCaptureService, AudioSegment } from './audioCapture';
import { DetectionResult } from './detectionModel';
import { ModelFactory } from './modelFactory';
import { StorageService } from './storageService';
import { LocationService } from './locationService';
import { Detection } from '../lib/supabase';

/**
 * Configuration for a sensor instance
 * Each mobile device acts as an independent sensor
 */
export interface SensorConfig {
  /** Unique identifier for this sensor/device (generated on first use) */
  deviceId: string;

  /** Length of each audio segment in milliseconds (default: 5000ms) */
  segmentDuration: number;

  /** Minimum confidence threshold for saving detections (0.0-1.0, default: 0.9) */
  detectionThreshold: number;

  /** Fallback latitude if GPS unavailable */
  latitude?: number;

  /** Fallback longitude if GPS unavailable */
  longitude?: number;
}

/**
 * Real-time statistics displayed to user
 * Updated after each audio segment analysis
 */
export interface SensorStats {
  /** Whether monitoring is currently active */
  isRunning: boolean;

  /** Total number of audio segments analyzed since app launch */
  totalSegmentsProcessed: number;

  /** Total number of Swift Parrot detections recorded */
  totalDetections: number;

  /** Number of detections waiting to upload to Supabase */
  pendingUploads: number;

  /** Timestamp of most recent detection */
  lastDetection?: Date;

  /** Confidence score of most recent analysis (0.0-1.0) */
  currentConfidence?: number;

  /** Number of consecutive API failures (monitoring stops at 5) */
  consecutiveErrors?: number;

  /** Most recent error message (if any) */
  lastError?: string;
}

/**
 * Main service orchestrating all monitoring components
 */
export class SensorService {
  private audioCapture: AudioCaptureService;
  private detectionModel: any = null; // BirdNET or TensorFlow model
  private storageService: StorageService;
  private locationService: LocationService;
  private config: SensorConfig;
  private stats: SensorStats;
  private onStatsUpdate?: (stats: SensorStats) => void;

  // Error handling state
  private consecutiveErrors: number = 0;
  private lastErrorTime: number = 0;
  private errorCooldown: number = 30000; // Show error message max once per 30 seconds

  /**
   * Create a new sensor service
   *
   * @param config - Sensor configuration (device ID, thresholds, etc.)
   * @param onStatsUpdate - Callback invoked whenever statistics change
   */
  constructor(config: SensorConfig, onStatsUpdate?: (stats: SensorStats) => void) {
    this.config = config;
    this.onStatsUpdate = onStatsUpdate;

    // Initialize statistics
    this.stats = {
      isRunning: false,
      totalSegmentsProcessed: 0,
      totalDetections: 0,
      pendingUploads: 0,
      consecutiveErrors: 0,
    };

    // Initialize audio capture with callback for each segment
    this.audioCapture = new AudioCaptureService(
      config.segmentDuration,
      this.handleAudioSegment.bind(this)
    );

    // Initialize storage and location services
    this.storageService = new StorageService();
    this.locationService = new LocationService();
  }

  /**
   * Initialize all services (must be called before start())
   *
   * - Creates detection model (BirdNET or fallback)
   * - Initializes storage service
   * - Requests GPS permissions
   *
   * @throws Error if model creation or initialization fails
   */
  async initialize(): Promise<void> {
    console.log('🔧 SensorService.initialize() START');
    
    try {
      // Step 1: Create detection model
      console.log('  📦 Step 1: Creating detection model via ModelFactory...');
      console.log('    - Threshold:', this.config.detectionThreshold);
      
      this.detectionModel = await ModelFactory.autoDetectAndCreate(
        this.config.detectionThreshold
      );
      
      console.log('  ✅ Step 1 complete: Model created');
      console.log('    - Model type:', this.detectionModel?.constructor?.name || 'unknown');

      // Step 2: Initialize storage service
      console.log('  📦 Step 2: Initializing storage service...');
      await this.storageService.initialize();
      console.log('  ✅ Step 2 complete: Storage initialized');

      // Step 3: Request location permission (with timeout)
      console.log('  📦 Step 3: Requesting location permission (5s timeout)...');
      try {
        const permissionPromise = this.locationService.requestPermission();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Location permission timeout')), 5000)
        );
        
        await Promise.race([permissionPromise, timeoutPromise]);
        console.log('  ✅ Step 3 complete: Location permission granted');
      } catch (error) {
        console.warn('  ⚠️ Step 3: Location permission failed (continuing anyway):', error instanceof Error ? error.message : String(error));
      }

      // Step 4: Update stats
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

  /**
   * Start monitoring for Swift Parrot calls
   *
   * - Starts GPS tracking
   * - Begins continuous audio capture
   * - Resets error counters
   *
   * @throws Error if audio capture fails (e.g., microphone permission denied)
   */
  async start(): Promise<void> {
    console.log('🔧 SensorService.start() CALLED');
    console.log('  📊 Current isRunning:', this.stats.isRunning);
    
    // Prevent double-start
    if (this.stats.isRunning) {
      console.log('  ⚠️ Already running, returning early');
      return;
    }

    // Reset error state when starting fresh
    console.log('  🔧 Resetting error counters...');
    this.consecutiveErrors = 0;
    this.stats.consecutiveErrors = 0;
    this.stats.lastError = undefined;
    console.log('  ✅ Error counters reset');

    // Start GPS tracking (with timeout)
    console.log('  📍 Step 1: Starting GPS tracking (5s timeout)...');
    try {
      const gpsPromise = this.locationService.startTracking();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GPS tracking timeout')), 5000)
      );
      
      await Promise.race([gpsPromise, timeoutPromise]);
      console.log('  ✅ GPS tracking started');
    } catch (gpsError) {
      console.warn('  ⚠️ GPS tracking failed (continuing without live GPS):', gpsError instanceof Error ? gpsError.message : String(gpsError));
      // Continue anyway - we have fallback coordinates
    }

    // Start audio capture
    console.log('  🎤 Step 2: Starting audio capture...');
    try {
      await this.audioCapture.start();
      console.log('  ✅ Audio capture started');
    } catch (audioError) {
      console.error('  ❌ Audio capture failed:', audioError);
      throw audioError;
    }

    // Update state
    console.log('  🔧 Setting isRunning = true...');
    this.stats.isRunning = true;
    console.log('  🔧 Calling updateStats()...');
    this.updateStats();
    console.log('  ✅ updateStats() complete');

    console.log('✅ SensorService.start() COMPLETE - Monitoring active!');
  }

  /**
   * Stop monitoring
   *
   * - Stops audio capture
   * - GPS tracking continues (for manual sync)
   */
  stop(): void {
    this.audioCapture.stop();
    this.stats.isRunning = false;
    this.updateStats();
  }

  /**
   * Handle each captured audio segment
   *
   * This is the core processing loop:
   * 1. Send audio to BirdNET for analysis
   * 2. If Swift Parrot detected → save to Supabase
   * 3. If error → increment counter and possibly stop monitoring
   *
   * @param segment - 5-second audio segment with timestamp
   */
  private async handleAudioSegment(segment: AudioSegment): Promise<void> {
    if (!this.detectionModel) {
      console.error('Detection model not initialized');
      return;
    }

    try {
      // Send audio file URI to BirdNET API for analysis
      // FileSystem.uploadAsync() requires file URI, not blob
      const result = await this.detectionModel.analyzeAudio(segment.uri);

      // Success! Reset error counters
      this.consecutiveErrors = 0;
      this.stats.consecutiveErrors = 0;
      this.stats.lastError = undefined;

      // Update statistics
      this.stats.totalSegmentsProcessed++;
      this.stats.currentConfidence = result.confidence;

      // If confidence ≥ threshold and species is Swift Parrot
      if (result.isPositive) {
        await this.handleDetection(segment, result);
      }

      this.updateStats();

    } catch (error) {
      // API call failed (network error, server down, etc.)
      this.consecutiveErrors++;
      this.stats.consecutiveErrors = this.consecutiveErrors;

      // Auto-stop after 5 consecutive failures to prevent battery drain
      if (this.consecutiveErrors >= 5) {
        console.error('Too many consecutive errors, stopping monitoring');
        this.stop();
        this.stats.lastError = 'Monitoring stopped after 5 consecutive failures. Check BirdNET server connection and try again.';
        this.updateStats();
        return;
      }

      // Show error message (but not more than once per 30 seconds)
      const now = Date.now();
      if (now - this.lastErrorTime > this.errorCooldown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Provide user-friendly error messages
        if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
          this.stats.lastError = 'BirdNET server unreachable. Check server configuration.';
        } else {
          this.stats.lastError = 'Analysis error: ' + errorMessage.substring(0, 100);
        }

        console.error('Error processing audio segment:', error);
        this.lastErrorTime = now;
        this.updateStats();
      }
    }
  }

  /**
   * Handle a positive detection
   *
   * - Increment detection counter
   * - Get current GPS coordinates
   * - Save audio file and metadata to Supabase
   *
   * @param segment - Audio segment containing the detection
   * @param result - Detection result from BirdNET (confidence, species, etc.)
   */
  private async handleDetection(
    segment: AudioSegment,
    result: DetectionResult
  ): Promise<void> {
    this.stats.totalDetections++;
    this.stats.lastDetection = segment.timestamp;

    // Get current GPS location (or use fallback from config)
    const location = await this.locationService.getCurrentLocation();

    // Prepare detection metadata for database
    const metadata: Omit<Detection, 'id' | 'audio_file_url'> = {
      device_id: this.config.deviceId,
      timestamp: segment.timestamp.toISOString(),
      latitude: location?.latitude || this.config.latitude,
      longitude: location?.longitude || this.config.longitude,
      model_name: result.modelName,
      confidence: result.confidence,
    };

    // Save audio file (via URI) and metadata to Supabase
    // If network unavailable, queues for later upload
    // Note: storageService will need to handle URI instead of blob
    // For now, we'll read the file and convert to blob for storage
    const response = await fetch(segment.uri);
    const blob = await response.blob();
    await this.storageService.saveDetection(blob, metadata);
    this.updateStats();
  }

  /**
   * Manually trigger upload of queued detections
   *
   * Useful after network connectivity is restored
   */
  async syncData(): Promise<void> {
    await this.storageService.attemptUpload();
    this.updateStats();
  }

  /**
   * Update statistics and notify UI
   *
   * Called after every segment analysis, detection, or error
   */
  private updateStats(): void {
    // Get pending upload count from storage service
    this.stats.pendingUploads = this.storageService.getPendingCount();

    // Notify UI component to re-render
    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  /**
   * Get current statistics snapshot
   *
   * @returns Copy of current statistics
   */
  getStats(): SensorStats {
    return { ...this.stats };
  }

  /**
   * Update sensor configuration while running
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<SensorConfig>): void {
    // Update detection threshold
    if (config.detectionThreshold !== undefined && this.detectionModel) {
      this.detectionModel.setThreshold(config.detectionThreshold);
      this.config.detectionThreshold = config.detectionThreshold;
    }

    // Update fallback GPS coordinates
    if (config.latitude !== undefined) {
      this.config.latitude = config.latitude;
    }

    if (config.longitude !== undefined) {
      this.config.longitude = config.longitude;
    }
  }

  /**
   * Get the name of the currently active detection model
   *
   * @returns Model name (e.g., "BirdNET", "MockModel")
   */
  getModelName(): string {
    return this.detectionModel?.getModelName() || 'Unknown';
  }
}
