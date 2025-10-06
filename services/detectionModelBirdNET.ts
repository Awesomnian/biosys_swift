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
 * This bypasses React Native's FormData bug by using direct REST API calls
 * to Supabase Storage instead of the Supabase JS client (which uses FormData).
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
      
      console.log('🔧 BirdNET Model initialized (Supabase Storage Proxy)');
      console.log('🎯 Detection threshold:', this.threshold);
    } catch (error) {
      console.error('❌ BirdNET constructor failed:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
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
      try {
        const { supabase } = await import('../lib/supabase');
        console.log('  ✅ Supabase client imported successfully');
      } catch (importError) {
        console.error('  ❌ Supabase client import failed:', importError);
        throw new Error(`Supabase client import failed: ${importError instanceof Error ? importError.message : String(importError)}`);
      }
      
      console.log('✅ BirdNET model ready (using Supabase Edge Function)');
      this.initialized = true;
    } catch (error) {
      console.error('❌ BirdNET initialize() failed:', error);
      console.error('Error details:', {
        type: typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      throw new Error(`BirdNET initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeAudio(audioUri: string): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      console.log('🔍 BirdNET Analysis Starting (via Supabase Storage)...');
      console.log('  🎵 Audio URI:', audioUri);

      if (!audioUri || audioUri.trim() === '') {
        throw new Error('Audio URI is required');
      }

      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error(`Audio file not found: ${audioUri}`);
      }

      console.log('  📦 File size:', fileInfo.size, 'bytes');

      // Step 1: Upload to Supabase Storage
      console.log('  📤 Step 1: Uploading to Supabase Storage...');
      
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const extension = audioUri.endsWith('.m4a') ? 'm4a' : 'wav';
      const filename = `temp/${timestamp}-${randomId}.${extension}`;

      console.log('  📁 Uploading as:', filename);

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey;

      // Upload using FileSystem.uploadAsync (only method that works for binary in React Native)
      const storageUrl = `${supabaseUrl}/storage/v1/object/detections/${filename}`;

      const uploadResponse = await FileSystem.uploadAsync(storageUrl, audioUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': extension === 'm4a' ? 'audio/mp4' : 'audio/wav',
        },
      });

      if (uploadResponse.status !== 200) {
        throw new Error(`Storage upload failed: ${uploadResponse.body}`);
      }

      console.log('  ✅ Uploaded to storage:', filename);

      // Step 2: Call Edge Function
      console.log('  🔄 Step 2: Calling Edge Function...');

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/analyze-birdcall`;
      
      const edgeResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath: filename,
          bucket: 'detections',
        }),
      });

      console.log('  📡 Edge Function response status:', edgeResponse.status);

      if (!edgeResponse.ok) {
        const errorText = await edgeResponse.text();
        console.error('  ❌ Edge Function error:', errorText);
        
        // Clean up storage file via REST API
        const deleteUrl = `${supabaseUrl}/storage/v1/object/detections/${filename}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });
        
        throw new Error(`Edge Function failed: ${errorText}`);
      }

      const result = await edgeResponse.json();

      // Step 3: Clean up temporary file
      console.log('  🗑️  Step 3: Cleaning up temp file...');
      const deleteUrl = `${supabaseUrl}/storage/v1/object/detections/${filename}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

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