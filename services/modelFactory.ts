import 'react-native-url-polyfill/auto';
import { SwiftParrotDetectionModel as MockModel } from './detectionModel';
import {
  SwiftParrotDetectionModel as TensorFlowModel,
  ModelConfig,
} from './detectionModelTensorFlow';
import {
  BirdNETDetectionModel,
  BirdNETConfig,
} from './detectionModelBirdNET';

export type ModelType = 'mock' | 'tensorflow' | 'birdnet';

export interface ModelFactoryConfig {
  type: ModelType;
  threshold?: number;
  modelPath?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export class ModelFactory {
  static async createModel(
    config: ModelFactoryConfig
  ): Promise<MockModel | TensorFlowModel | BirdNETDetectionModel> {
    const threshold = config.threshold || 0.9;

    if (config.type === 'mock') {
      console.log('Creating mock detection model');
      const model = new MockModel(threshold);
      await model.initialize();
      return model;
    }

    if (config.type === 'tensorflow') {
      if (!config.modelPath) {
        throw new Error('modelPath is required for TensorFlow model');
      }

      console.log('Creating TensorFlow detection model');
      const tfConfig: ModelConfig = {
        modelPath: config.modelPath,
        threshold,
      };

      const model = new TensorFlowModel(tfConfig);
      await model.initialize();
      return model;
    }

    if (config.type === 'birdnet') {
      console.log('Creating BirdNET detection model');
      const birdnetConfig: BirdNETConfig = {
        threshold,
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
      };

      const model = new BirdNETDetectionModel(birdnetConfig);
      await model.initialize();
      return model;
    }

    throw new Error(`Unknown model type: ${config.type}`);
  }

  static async autoDetectAndCreate(
    threshold: number = 0.9
  ): Promise<MockModel | TensorFlowModel | BirdNETDetectionModel> {
    console.log('Using BirdNET model as default');
    return await ModelFactory.createModel({
      type: 'birdnet',
      threshold,
    });
  }

  static async createBirdNETModel(
    threshold: number = 0.9
  ): Promise<BirdNETDetectionModel> {
    console.log('Creating BirdNET model');
    return await ModelFactory.createModel({
      type: 'birdnet',
      threshold,
    }) as BirdNETDetectionModel;
  }
}
