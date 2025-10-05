export interface DetectionResult {
  confidence: number;
  modelName: string;
  isPositive: boolean;
}

export class SwiftParrotDetectionModel {
  private modelName: string = 'SwiftParrot_Mock_v1.0';
  private threshold: number;
  private initialized: boolean = false;

  constructor(threshold: number = 0.9) {
    this.threshold = threshold;
  }

  async initialize(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.initialized = true;
  }

  async analyzeAudio(audioBlob: Blob): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error('Model not initialized');
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const randomConfidence = Math.random();

    const simulatedConfidence = randomConfidence > 0.95
      ? 0.85 + Math.random() * 0.15
      : Math.random() * 0.7;

    const confidence = Math.min(0.99, Math.max(0.0, simulatedConfidence));

    return {
      confidence,
      modelName: this.modelName,
      isPositive: confidence >= this.threshold,
    };
  }

  setThreshold(threshold: number): void {
    this.threshold = Math.min(1.0, Math.max(0.0, threshold));
  }

  getThreshold(): number {
    return this.threshold;
  }

  getModelName(): string {
    return this.modelName;
  }
}
