/**
 * BirdNET Detection Model - Bird Species Identification via Neural Network
 *
 * This module interfaces with the BirdNET machine learning model for automated
 * bird species identification from audio recordings. BirdNET is a deep learning
 * model trained on millions of bird calls from around the world.
 *
 * INTEGRATION OPTIONS:
 * 1. Direct Server (RECOMMENDED FOR POC):
 *    - Set EXPO_PUBLIC_BIRDNET_SERVER_URL in .env
 *    - Points to Docker container or cloud deployment
 *    - Example: https://your-ngrok-url.ngrok-free.dev
 *
 * 2. Supabase Edge Function (ALTERNATIVE):
 *    - Deploy analyze-birdcall function to Supabase
 *    - Uses Supabase URL and anon key
 *    - Currently NOT USED in this POC
 *
 * API CONTRACT (BirdNET Inference Server):
 * - Endpoint: POST /inference/
 * - Content-Type: multipart/form-data
 * - Field name: "file" (audio blob)
 * - Response format:
 *   {
 *     "predictions": [
 *       {
 *         "start_time": 0,
 *         "stop_time": 3,
 *         "species": [
 *           {
 *             "species_name": "Lathamus discolor_Swift Parrot",
 *             "probability": 0.95
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * SWIFT PARROT DETECTION LOGIC:
 * - Scans all species predictions
 * - Looks for "swift" or "lathamus" in species name (case-insensitive)
 * - Returns highest Swift Parrot confidence if found
 * - Falls back to highest confidence of any species
 * - Only marks isPositive=true if Swift Parrot confidence ≥ threshold
 */

/**
 * Result returned from BirdNET analysis
 */
export interface DetectionResult {
  /** Confidence score (0.0-1.0) for the detected species */
  confidence: number;

  /** Name of the ML model used ("BirdNET") */
  modelName: string;

  /** Whether detection meets threshold and is Swift Parrot */
  isPositive: boolean;

  /** Top detected species (may not be Swift Parrot) */
  species?: string;

  /** Common name of detected species */
  commonName?: string;

  /** Scientific name of detected species */
  scientificName?: string;

  /** All species detections from BirdNET (sorted by confidence) */
  allDetections?: Array<{
    species: string;
    common_name: string;
    scientific_name: string;
    confidence: number;
  }>;
}

/**
 * Configuration for BirdNET model
 */
export interface BirdNETConfig {
  /** Minimum confidence threshold for positive detection (0.0-1.0) */
  threshold: number;

  /** Supabase project URL (for edge function mode) */
  supabaseUrl?: string;

  /** Supabase anonymous key (for edge function mode) */
  supabaseAnonKey?: string;

  /** Direct BirdNET server URL (for direct server mode - RECOMMENDED) */
  birdnetServerUrl?: string;
}

/**
 * BirdNET Detection Model Implementation
 *
 * Handles communication with BirdNET API for bird species identification.
 * Prioritizes direct server connection over Supabase edge function.
 */
export class BirdNETDetectionModel {
  private threshold: number;
  private edgeFunctionUrl: string;
  private anonKey: string;
  private initialized: boolean = false;
  private useDirectServer: boolean = false;

  /**
   * Create BirdNET detection model
   *
   * AUTO-DETECTION:
   * 1. If EXPO_PUBLIC_BIRDNET_SERVER_URL exists → use direct server (ngrok/cloud)
   * 2. Otherwise → use Supabase edge function (requires Supabase credentials)
   * 3. If neither available → throws error
   *
   * @param config - Model configuration with threshold and API endpoints
   * @throws Error if no valid API endpoint configured
   */
  constructor(config: BirdNETConfig) {
    this.threshold = config.threshold;

    // ALWAYS use Supabase Edge Function (proxies to ngrok internally)
    // This avoids React Native FormData issues
    const supabaseUrl =
      config.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      config.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

    this.useDirectServer = false;
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/analyze-birdcall`;
    this.anonKey = supabaseAnonKey;
    console.log('Using Supabase Edge Function:', this.edgeFunctionUrl);
  }

  /**
   * Initialize the model (required before analysis)
   *
   * Lightweight initialization - just logs configuration.
   * Actual model loading happens server-side.
   */
  async initialize(): Promise<void> {
    console.log('BirdNET model initialized');
    console.log(`Edge function URL: ${this.edgeFunctionUrl}`);
    this.initialized = true;
  }

  /**
   * Analyze audio for bird species identification
   *
   * PROCESS:
   * 1. Convert audio blob to FormData with field name "file"
   * 2. POST to BirdNET /inference/ endpoint
   * 3. Parse predictions array from response
   * 4. Extract all species detections
   * 5. Find Swift Parrot detections (species name contains "swift" or "lathamus")
   * 6. Return highest Swift Parrot confidence if found
   * 7. Mark isPositive=true only if Swift Parrot confidence ≥ threshold
   *
   * @param audioBlob - Audio segment to analyze (typically 5 seconds, .webm format)
   * @returns Detection result with confidence, species, and all predictions
   * @throws Error if model not initialized or API call fails
   */
  async analyzeAudio(audioBlob: Blob): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      // Prepare multipart form data for Supabase Edge Function
      const formData = new FormData();

      // Determine file extension from blob type
      let filename = 'audio.wav'; // Default to WAV for PCM
      if (audioBlob.type.includes('webm')) {
        filename = 'audio.webm';
      } else if (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) {
        filename = 'audio.m4a';
      } else if (audioBlob.type.includes('wav')) {
        filename = 'audio.wav';
      }

      // Edge function expects field name "audio"
      formData.append('audio', audioBlob, filename);

      console.log('Sending audio to Supabase Edge Function...');
      console.log('URL:', this.edgeFunctionUrl);
      console.log('Blob size:', audioBlob.size, 'bytes');
      console.log('Blob type:', audioBlob.type);
      console.log('Filename:', filename);

      // Set up headers
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.anonKey}`,
        'apikey': this.anonKey,
      };

      console.log('Making POST request with fetch...');

      // Use standard fetch - Supabase client handles it properly
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log('Response status:', response.status, response.statusText);

      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(
          `BirdNET server returned ${response.status}: ${errorText}`
        );
      }

      // Parse response JSON
      const result = await response.json();

      const inferenceTime = Date.now() - startTime;

      console.log('Edge function response:', JSON.stringify(result));

      // Edge function already processes and returns simplified format
      // {confidence, isPositive, modelName, species, allDetections}
      if (result.error) {
        throw new Error(`Edge function error: ${result.error}`);
      }

      const allDetections = result.allDetections?.map((d: any) => ({
        species: d.species_name,
        common_name: d.species_name.split('_')[1] || d.species_name,
        scientific_name: d.species_name.split('_')[0] || d.species_name,
        confidence: d.probability,
      })) || [];

      console.log(
        `BirdNET analysis completed in ${inferenceTime}ms, confidence: ${result.confidence.toFixed(3)}, positive: ${result.isPositive}`
      );

      // Return structured detection result
      return {
        confidence: result.confidence,
        modelName: result.modelName,
        isPositive: result.isPositive,
        species: result.species,
        commonName: result.species?.split('_')[1] || result.species,
        scientificName: result.species?.split('_')[0] || result.species,
        allDetections,
      };
    } catch (error) {
      console.error('BirdNET analysis failed:', error);

      // Provide more helpful error messages
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error(
          `Cannot reach BirdNET server at ${this.edgeFunctionUrl}. ` +
          `Check: (1) ngrok is running, (2) URL in .env is correct, (3) phone has internet`
        );
      }

      throw new Error(`BirdNET analysis failed: ${error}`);
    }
  }

  /**
   * Update detection threshold
   *
   * @param threshold - New threshold (0.0-1.0, clamped to range)
   */
  setThreshold(threshold: number): void {
    this.threshold = Math.min(1.0, Math.max(0.0, threshold));
    console.log(`BirdNET detection threshold updated to ${this.threshold}`);
  }

  /**
   * Get current detection threshold
   *
   * @returns Current threshold (0.0-1.0)
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Get model name for display
   *
   * @returns "BirdNET"
   */
  getModelName(): string {
    return 'BirdNET';
  }

  /**
   * Check if model is initialized
   *
   * @returns true if initialize() has been called
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the configured API endpoint URL
   *
   * @returns URL being used for inference requests
   */
  getEdgeFunctionUrl(): string {
    return this.edgeFunctionUrl;
  }
}
