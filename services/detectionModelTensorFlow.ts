import 'react-native-url-polyfill/auto';
import * as tf from '@tensorflow/tfjs';
import { AudioPreprocessor, DEFAULT_SPECTROGRAM_CONFIG } from './audioPreprocessing';

export interface DetectionResult {
  confidence: number;
  modelName: string;
  isPositive: boolean;
}

export interface ModelConfig {
  modelPath: string;
  threshold: number;
  spectrogramConfig?: typeof DEFAULT_SPECTROGRAM_CONFIG;
}

export class SwiftParrotDetectionModel {
  private model: tf.LayersModel | null = null;
  private threshold: number;
  private modelPath: string;
  private preprocessor: AudioPreprocessor;
  private initialized: boolean = false;
  private modelName: string = 'SwiftParrot_TensorFlow';

  constructor(config: ModelConfig) {
    this.modelPath = config.modelPath;
    this.threshold = config.threshold;
    this.preprocessor = new AudioPreprocessor(
      config.spectrogramConfig || DEFAULT_SPECTROGRAM_CONFIG
    );
  }

  async initialize(): Promise<void> {
    try {
      console.log(`Loading TensorFlow.js model from ${this.modelPath}...`);

      this.model = await tf.loadLayersModel(this.modelPath);

      console.log('Model loaded successfully');
      console.log('Input shape:', this.model.inputs[0].shape);
      console.log('Output shape:', this.model.outputs[0].shape);

      this.initialized = true;

      const modelMetadata = this.extractModelMetadata();
      if (modelMetadata) {
        this.modelName = modelMetadata;
      }
    } catch (error) {
      console.error('Failed to load TensorFlow.js model:', error);
      throw new Error(`Model initialization failed: ${error}`);
    }
  }

  async analyzeAudio(audioBlob: Blob): Promise<DetectionResult> {
    if (!this.initialized || !this.model) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      const audioBuffer = await this.preprocessor.blobToAudioBuffer(audioBlob);

      const melSpectrogram = this.preprocessor.extractMelSpectrogram(audioBuffer);

      const inputShape = this.preprocessor.getInputShape();
      const flatData = melSpectrogram[0].flat();
      const inputTensor = tf.tensor4d(flatData, inputShape);

      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const predictionData = await prediction.data();

      let confidence: number;
      if (predictionData.length === 1) {
        confidence = predictionData[0];
      } else if (predictionData.length === 2) {
        confidence = predictionData[1];
      } else {
        confidence = Math.max(...Array.from(predictionData));
      }

      inputTensor.dispose();
      prediction.dispose();

      const inferenceTime = Date.now() - startTime;
      console.log(`Inference completed in ${inferenceTime}ms, confidence: ${confidence.toFixed(3)}`);

      return {
        confidence: Math.min(0.99, Math.max(0.0, confidence)),
        modelName: this.modelName,
        isPositive: confidence >= this.threshold,
      };
    } catch (error) {
      console.error('Audio analysis failed:', error);
      throw new Error(`Audio analysis failed: ${error}`);
    }
  }

  setThreshold(threshold: number): void {
    this.threshold = Math.min(1.0, Math.max(0.0, threshold));
    console.log(`Detection threshold updated to ${this.threshold}`);
  }

  getThreshold(): number {
    return this.threshold;
  }

  getModelName(): string {
    return this.modelName;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getModelInfo(): { inputShape: number[]; outputShape: number[] } | null {
    if (!this.model) return null;

    return {
      inputShape: this.model.inputs[0].shape as number[],
      outputShape: this.model.outputs[0].shape as number[],
    };
  }

  private extractModelMetadata(): string | null {
    try {
      const pathParts = this.modelPath.split('/');
      const modelFolder = pathParts[pathParts.length - 2];
      return `SwiftParrot_${modelFolder}_v1.0`;
    } catch {
      return null;
    }
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.initialized = false;
      console.log('Model disposed');
    }
  }
}
