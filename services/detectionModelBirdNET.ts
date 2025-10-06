/**
 * BirdNET Detection Model - Local Proxy Approach
 * 
 * ARCHITECTURE:
 * 1. Upload M4A audio to local proxy (via ngrok)
 * 2. Proxy converts M4A→WAV using ffmpeg
 * 3. Proxy forwards WAV to BirdNET
 * 4. Proxy returns predictions
 */

import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

export interface DetectionResult {
  confidence: number;
  modelName: string;
  isPositive: boolean;
  species?: string;
  commonName?: string;
  scientificName?: string;
  allDetections?: Array<{
    species: string;
    common_name: string;
    scientific_name: string;
    confidence: number;
  }>;
}

export interface BirdNETConfig {
  threshold: number;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export class BirdNETDetectionModel {
  private threshold: number;
  private initialized: boolean = false;

  constructor(config: BirdNETConfig) {
    try {
      console.log('🔧 BirdNET Model constructor starting...');
      console.log('  📋 Config received:', {
        threshold: config.threshold,
        hasSupabaseUrl: !!config.supabaseUrl,
        hasSupabaseKey: !!config.supabaseAnonKey
      });
      
      this.threshold = config.threshold;
      
      console.log('🔧 BirdNET Model initialized (Local Proxy)');
      console.log('🎯 Detection threshold:', this.threshold);
    } catch (error) {
      console.error('❌ BirdNET constructor failed:', error);
      throw new Error(`BirdNET constructor failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 BirdNET model initializing...');
      
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey;
      
      console.log('  🔍 Environment check:');
      console.log('    Supabase URL present:', !!supabaseUrl);
      console.log('    Supabase Key present:', !!supabaseKey);
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials in app.json extra config');
      }
      
      console.log('  📦 Testing Supabase client import...');
      const { supabase } = await import('../lib/supabase');
      console.log('  ✅ Supabase client imported successfully');
      
      console.log('✅ BirdNET model ready (using Local Proxy)');
      this.initialized = true;
    } catch (error) {
      console.error('❌ BirdNET initialize() failed:', error);
      throw new Error(`BirdNET initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeAudio(audioUri: string): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      console.log('🔍 BirdNET Analysis via Local Proxy...');
      console.log('  🎵 Audio URI:', audioUri);

      if (!audioUri || audioUri.trim() === '') {
        throw new Error('Audio URI is required');
      }

      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error(`Audio file not found: ${audioUri}`);
      }

      console.log('  📦 File size:', fileInfo.size, 'bytes');

      // Upload to local proxy via ngrok
      console.log('  📤 Uploading to proxy...');
      const response = await FileSystem.uploadAsync(
        'https://pruinose-alise-uncooled.ngrok-free.dev/convert',
        audioUri,
        {
          fieldName: 'audio',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        }
      );

      const duration = Date.now() - startTime;
      console.log(`  📡 Response status: ${response.status}`);
      
      if (response.status !== 200) {
        console.error('  ❌ Proxy error:', response.body);
        throw new Error(`Proxy returned status ${response.status}: ${response.body}`);
      }

      const predictions = JSON.parse(response.body);
      console.log('  🔍 BirdNET raw response:', JSON.stringify(predictions).substring(0, 500));
      console.log(`  ✅ Analysis complete in ${duration}ms`);

      // Extract predictions array from response object
      const predictionsList = predictions.predictions || [];
      if (!Array.isArray(predictionsList)) {
        throw new Error('Invalid response format from BirdNET');
      }

      // Flatten species from all time segments
      const allSpecies = predictionsList.flatMap(segment => segment.species || []);
      console.log(`  📊 Raw detections: ${allSpecies.length}`);

      // Filter by threshold
      const validPredictions = allSpecies.filter((p: any) => p.probability >= this.threshold);
      console.log(`  🎯 Predictions above threshold (${this.threshold}): ${validPredictions.length}`);

      // Check for Swift Parrot
      const swiftParrot = validPredictions.find((p: any) => 
        p.species_name && p.species_name.toLowerCase().includes('lathamus')
      );

      const isPositive = !!swiftParrot;
      const topPrediction = validPredictions[0];

      console.log('  🦜 Swift Parrot detected:', isPositive ? 'YES' : 'NO');
      if (topPrediction) {
        console.log('  🏆 Top detection:', topPrediction.species_name, `(${(topPrediction.probability * 100).toFixed(1)}%)`);
      }

      const allDetections = validPredictions.map((d: any) => ({
        species: d.species_name,
        common_name: d.species_name.split('_')[1] || d.species_name,
        scientific_name: d.species_name.split('_')[0] || '',
        confidence: d.probability,
      }));

      // Clean up local file
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (deleteError) {
        console.warn('  ⚠️ Could not delete local file:', deleteError);
      }

      return {
        confidence: swiftParrot?.probability || topPrediction?.probability || 0,
        modelName: 'BirdNET',
        isPositive,
        species: swiftParrot?.species_name || topPrediction?.species_name,
        commonName: swiftParrot?.species_name?.split('_')[1] || topPrediction?.species_name?.split('_')[1],
        scientificName: swiftParrot?.species_name?.split('_')[0] || topPrediction?.species_name?.split('_')[0],
        allDetections,
      };

    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.error(`❌ BirdNET analysis failed after ${elapsedTime}ms`);
      console.error('Error details:', error);

      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (deleteError) {
        // Ignore cleanup errors
      }

      throw new Error(`Failed to analyze audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  setThreshold(threshold: number): void {
    this.threshold = Math.min(1.0, Math.max(0.0, threshold));
    console.log(`🎯 BirdNET detection threshold updated to ${this.threshold}`);
  }

  getThreshold(): number {
    return this.threshold;
  }

  getModelName(): string {
    return 'BirdNET';
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}