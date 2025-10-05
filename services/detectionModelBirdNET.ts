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
  birdnetServerUrl?: string;
}

export class BirdNETDetectionModel {
  private threshold: number;
  private edgeFunctionUrl: string;
  private anonKey: string;
  private initialized: boolean = false;
  private useDirectServer: boolean = false;

  constructor(config: BirdNETConfig) {
    this.threshold = config.threshold;

    const birdnetServerUrl =
      config.birdnetServerUrl || process.env.EXPO_PUBLIC_BIRDNET_SERVER_URL;

    if (birdnetServerUrl) {
      this.useDirectServer = true;
      this.edgeFunctionUrl = `${birdnetServerUrl}/api/v1/analyze`;
      this.anonKey = '';
      console.log('Using direct BirdNET server:', this.edgeFunctionUrl);
    } else {
      const supabaseUrl =
        config.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey =
        config.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Either BIRDNET_SERVER_URL or Supabase URL and Anon Key are required'
        );
      }

      this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/analyze-birdcall`;
      this.anonKey = supabaseAnonKey;
      console.log('Using Supabase Edge Function:', this.edgeFunctionUrl);
    }
  }

  async initialize(): Promise<void> {
    console.log('BirdNET model initialized');
    console.log(`Edge function URL: ${this.edgeFunctionUrl}`);
    this.initialized = true;
  }

  async analyzeAudio(audioBlob: Blob): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      console.log('Sending audio to BirdNET edge function...');

      const headers: Record<string, string> = {};

      if (!this.useDirectServer && this.anonKey) {
        headers['Authorization'] = `Bearer ${this.anonKey}`;
      }

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `BirdNET edge function returned ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();

      const inferenceTime = Date.now() - startTime;
      console.log(
        `BirdNET analysis completed in ${inferenceTime}ms, confidence: ${result.confidence.toFixed(3)}`
      );

      if (result.isPositive) {
        console.log(
          `Swift Parrot detected! Species: ${result.commonName || result.scientificName}`
        );
      }

      return {
        confidence: Math.min(0.99, Math.max(0.0, result.confidence)),
        modelName: 'BirdNET',
        isPositive: result.confidence >= this.threshold,
        species: result.species,
        commonName: result.commonName,
        scientificName: result.scientificName,
        allDetections: result.allDetections,
      };
    } catch (error) {
      console.error('BirdNET analysis failed:', error);
      throw new Error(`BirdNET analysis failed: ${error}`);
    }
  }

  setThreshold(threshold: number): void {
    this.threshold = Math.min(1.0, Math.max(0.0, threshold));
    console.log(`BirdNET detection threshold updated to ${this.threshold}`);
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

  getEdgeFunctionUrl(): string {
    return this.edgeFunctionUrl;
  }
}
