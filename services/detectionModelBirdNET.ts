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
      this.edgeFunctionUrl = `${birdnetServerUrl}/inference/`;
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
      formData.append('file', audioBlob, 'audio.webm');

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

      let maxConfidence = 0;
      let swiftParrotConfidence = 0;
      let detectedSpecies = '';
      const allDetections: Array<{species: string; common_name: string; scientific_name: string; confidence: number}> = [];

      if (result.predictions && result.predictions.length > 0) {
        for (const segment of result.predictions) {
          for (const species of segment.species) {
            const speciesName = species.species_name || '';
            const confidence = species.probability || 0;

            allDetections.push({
              species: speciesName,
              common_name: speciesName.split('_')[0] || speciesName,
              scientific_name: speciesName,
              confidence: confidence
            });

            if (confidence > maxConfidence) {
              maxConfidence = confidence;
              detectedSpecies = speciesName;
            }

            if (speciesName.toLowerCase().includes('swift') || speciesName.toLowerCase().includes('lathamus')) {
              swiftParrotConfidence = Math.max(swiftParrotConfidence, confidence);
            }
          }
        }
      }

      const finalConfidence = swiftParrotConfidence > 0 ? swiftParrotConfidence : maxConfidence;
      const isSwiftParrot = swiftParrotConfidence >= this.threshold;

      console.log(
        `BirdNET analysis completed in ${inferenceTime}ms, top confidence: ${maxConfidence.toFixed(3)}, swift parrot: ${swiftParrotConfidence.toFixed(3)}`
      );

      if (isSwiftParrot) {
        console.log(
          `Swift Parrot detected! Confidence: ${swiftParrotConfidence.toFixed(3)}`
        );
      }

      return {
        confidence: finalConfidence,
        modelName: 'BirdNET',
        isPositive: isSwiftParrot,
        species: detectedSpecies,
        commonName: detectedSpecies.split('_')[0] || detectedSpecies,
        scientificName: detectedSpecies,
        allDetections: allDetections,
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
