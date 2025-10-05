/**
 * BirdNET Detection Model - Supabase Storage Proxy Approach
 * 
 * ARCHITECTURE:
 * 1. Upload audio to Supabase Storage (reliable on Android)
 * 2. Call Supabase Edge Function with storage path
 * 3. Edge Function downloads from storage
 * 4. Edge Function uploads to BirdNET (server-side FormData works!)
 * 5. Edge Function returns predictions
 * 
 * This bypasses React Native's FormData AND FileSystem.uploadAsync() bugs
 * by using proven Supabase Storage uploads.
 */

import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

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
      this.threshold = config.threshold;
      console.log('🔧 BirdNET Model initialized (Supabase Storage Proxy)');
      console.log('🎯 Detection threshold:', this.threshold);
    } catch (error) {
      console.error('❌ BirdNET constructor failed:', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 BirdNET model initializing...');
      console.log('✅ BirdNET model ready (using Supabase Edge Function)');
      this.initialized = true;
    } catch (error) {
      console.error('❌ BirdNET initialize() failed:', error);
      throw error;
    }
  }

  /**
   * Analyze audio via Supabase Storage→Edge Function→BirdNET
   * 
   * @param audioUri - Local file URI of audio recording
   * @returns Detection result with Swift Parrot identification
   */
  async analyzeAudio(audioUri: string): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      console.log('🔍 BirdNET Analysis Starting (via Supabase Storage)...');
      console.log('  🎵 Audio URI:', audioUri);

      // Validate audio URI
      if (!audioUri || audioUri.trim() === '') {
        throw new Error('Audio URI is required');
      }

      // Check file exists
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error(`Audio file not found: ${audioUri}`);
      }

      console.log('  📦 File size:', fileInfo.size, 'bytes');

      // Step 1: Upload to Supabase Storage
      console.log('  📤 Step 1: Uploading to Supabase Storage...');
      
      // Read file as base64, then convert to Uint8Array
      const base64Data = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const extension = audioUri.endsWith('.m4a') ? 'm4a' : 'wav';
      const filename = `temp/${timestamp}-${randomId}.${extension}`;

      console.log('  📁 Uploading as:', filename);
      console.log('  📦 Binary size:', bytes.length, 'bytes');

      // Upload to Supabase Storage using Uint8Array (works better than blob on React Native)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('detections')
        .upload(filename, bytes, {
          contentType: extension === 'm4a' ? 'audio/mp4' : 'audio/wav',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      console.log('  ✅ Uploaded to storage:', uploadData.path);

      // Step 2: Call Edge Function with storage path
      console.log('  🔄 Step 2: Calling Edge Function...');

      const edgeFunctionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-birdcall`;
      
      const edgeResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath: uploadData.path,
          bucket: 'detections',
        }),
      });

      console.log('  📡 Edge Function response status:', edgeResponse.status);

      if (!edgeResponse.ok) {
        const errorText = await edgeResponse.text();
        console.error('  ❌ Edge Function error:', errorText);
        
        // Clean up storage file
        await supabase.storage.from('detections').remove([uploadData.path]);
        
        throw new Error(`Edge Function failed: ${errorText}`);
      }

      const result = await edgeResponse.json();

      // Step 3: Clean up temporary file
      console.log('  🗑️  Step 3: Cleaning up temp file...');
      await supabase.storage.from('detections').remove([uploadData.path]);

      // Clean up local file
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (deleteError) {
        console.warn('  ⚠️  Could not delete local file:', deleteError);
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`  ⏱️  Total analysis time: ${elapsedTime}ms`);
      console.log('  ✅ BirdNET analysis complete');
      
      if (result.allDetections && result.allDetections.length > 0) {
        console.log('  🏆 Top detection:', result.allDetections[0].species_name);
        console.log('  🦜 Swift Parrot detected:', result.isPositive ? 'YES' : 'NO');
      }

      // Transform Edge Function response to our format
      const allDetections = result.allDetections?.map((d: any) => ({
        species: d.species_name,
        common_name: d.species_name.split('_')[1] || d.species_name,
        scientific_name: d.species_name.split('_')[0] || '',
        confidence: d.probability,
      })) || [];

      return {
        confidence: result.confidence,
        modelName: result.modelName,
        isPositive: result.isPositive,
        species: result.species,
        commonName: result.species?.split('_')[1] || result.species,
        scientificName: result.species?.split('_')[0] || '',
        allDetections,
      };

    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.error(`❌ BirdNET analysis failed after ${elapsedTime}ms`);
      console.error('Error details:', error);

      // Clean up local file even on error
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
