/**
 * Detection Model Interface
 * 
 * Defines the contract for detection model implementations.
 */

export interface DetectionResult {
  isPositive: boolean;
  confidence: number;
  species?: string;
  scientificName?: string;
  commonName?: string;
  modelName: string;
  allDetections?: Array<{
    species: string;
    confidence: number;
  }>;
}

export interface DetectionModel {
  analyzeAudio(audioUri: string): Promise<DetectionResult>;
  setThreshold(threshold: number): void;
  setLocation(latitude: number, longitude: number): void;
  getModelName(): string;
}
