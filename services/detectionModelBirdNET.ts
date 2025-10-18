/**
 * BirdNET Detection Model - Local Proxy Approach
 * 
 * Now monitors for:
 * - Swift Parrot (Lathamus discolor)
 * - Orange-bellied Parrot (Neophema chrysogaster)
 */

// supabase client is not needed directly in this module; import lazily where required
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

export interface DetectionResult {
  confidence: number;
  modelName: string;
  isPositive: boolean;
  species?: string;
  commonName?: string;
  scientificName?: string;
  allDetections?: {
    species: string;
    common_name: string;
    scientific_name: string;
    confidence: number;
  }[];
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
        console.warn('  ⚠️ Supabase credentials not found in app config. Continuing without a runtime Supabase client check. Upload/DB operations may fail later if Supabase is not configured.');
      } else {
        try {
          console.log('  📦 Testing Supabase client import...');
          await import('../lib/supabase');
          console.log('  ✅ Supabase client imported successfully');
        } catch (impErr) {
          console.warn('  ⚠️ Supabase client import failed, continuing. Error:', impErr);
        }
      }

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

        console.log('  ⚓ Uploading to proxy...');
        const birdnetBase = Constants.expoConfig?.extra?.birdnetUrl || 'https://pruinose-alise-uncooled.ngrok-free.dev';
        const candidatePaths = ['/convert', '/analyze', '/predict', '/inference', '/'];

        let response: any = null;
        let usedEndpoint: string | null = null;

        for (const p of candidatePaths) {
          const endpoint = `${birdnetBase.replace(/\/$/, '')}${p}`;
          console.log(`  🔎 Trying endpoint: ${endpoint}`);
          try {
            response = await FileSystem.uploadAsync(endpoint, audioUri, {
              fieldName: 'audio',
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            });

            console.log(`  ℹ️ Received status ${response.status} from ${endpoint}`);

            // Accept 200-299 as success; treat 404 as endpoint mismatch and try next
            if (response.status >= 200 && response.status < 300) {
              usedEndpoint = endpoint;
              break;
            } else if (response.status === 404) {
              console.warn(`  ⚠️ 404 from ${endpoint}, trying next candidate`);
              // try next
            } else {
              // For other status codes, log and break to surface error
              console.error(`  ❌ Unexpected status ${response.status} from ${endpoint}: ${response.body}`);
              usedEndpoint = endpoint;
              break;
            }
          } catch (err) {
            console.warn(`  ⚠️ Network/Upload error to ${endpoint}:`, err instanceof Error ? err.message : String(err));
            // try next endpoint
            response = null;
          }
        }

        if (!response) {
          throw new Error(`Failed to upload to BirdNET proxy - no successful endpoint found (tried ${candidatePaths.join(', ')})`);
        }

      const duration = Date.now() - startTime;
      console.log(`  📡 Response status: ${response.status}`);
      
      if (response.status < 200 || response.status >= 300) {
        console.error('  ❌ Proxy error:', response.body);
        throw new Error(`Proxy returned status ${response.status}: ${response.body}`);
      }

      const predictions = JSON.parse(response.body);
      console.log('  🔍 BirdNET raw response:', JSON.stringify(predictions).substring(0, 500));
      console.log(`  ✅ Analysis complete in ${duration}ms`);

      const predictionsList = predictions.predictions || [];
      if (!Array.isArray(predictionsList)) {
        throw new Error('Invalid response format from BirdNET');
      }

      const allSpecies = predictionsList.flatMap(segment => segment.species || []);
      console.log(`  📊 Raw detections: ${allSpecies.length}`);

      const validPredictions = allSpecies.filter((p: any) => p.probability >= this.threshold);
      console.log(`  🎯 Predictions above threshold (${this.threshold}): ${validPredictions.length}`);

      // Check for target species: Swift Parrot OR Orange-bellied Parrot
      const swiftParrot = validPredictions.find((p: any) => 
        p.species_name && p.species_name.toLowerCase().includes('lathamus')
      );
      
      const orangeBelliedParrot = validPredictions.find((p: any) => 
        p.species_name && p.species_name.toLowerCase().includes('neophema chrysogaster')
      );

      // Positive if either species detected
      const targetDetection = swiftParrot || orangeBelliedParrot;
      const isPositive = !!targetDetection;
      const topPrediction = validPredictions[0];

      console.log('  🦜 Swift Parrot detected:', swiftParrot ? 'YES' : 'NO');
      console.log('  🦜 Orange-bellied Parrot detected:', orangeBelliedParrot ? 'YES' : 'NO');
      
      if (targetDetection) {
        console.log('  🏆 Target detection:', targetDetection.species_name, `(${(targetDetection.probability * 100).toFixed(1)}%)`);
      } else if (topPrediction) {
        console.log('  🏆 Top detection:', topPrediction.species_name, `(${(topPrediction.probability * 100).toFixed(1)}%)`);
      }

      const allDetections = validPredictions.map((d: any) => ({
        species: d.species_name,
        common_name: d.species_name.split('_')[1] || d.species_name,
        scientific_name: d.species_name.split('_')[0] || '',
        confidence: d.probability,
      }));

      return {
        confidence: targetDetection?.probability || topPrediction?.probability || 0,
        modelName: 'BirdNET',
        isPositive,
        species: targetDetection?.species_name || topPrediction?.species_name,
        commonName: targetDetection?.species_name?.split('_')[1] || topPrediction?.species_name?.split('_')[1],
        scientificName: targetDetection?.species_name?.split('_')[0] || topPrediction?.species_name?.split('_')[0],
        allDetections,
      };

    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.error(`❌ BirdNET analysis failed after ${elapsedTime}ms`);
      console.error('Error details:', error);

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