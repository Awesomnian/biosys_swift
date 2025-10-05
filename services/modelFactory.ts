import { SwiftParrotDetectionModel as MockModel } from './detectionModel';

export type ModelType = 'mock' | 'tensorflow' | 'birdnet';

export interface ModelFactoryConfig {
  type: ModelType;
  threshold?: number;
  modelPath?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export class ModelFactory {
  static async createModel(config: ModelFactoryConfig): Promise<any> {
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
      const { SwiftParrotDetectionModel: TensorFlowModel } = await import('./detectionModelTensorFlow');

      const tfConfig = {
        modelPath: config.modelPath,
        threshold,
      };

      const model = new TensorFlowModel(tfConfig);
      await model.initialize();
      return model;
    }

    if (config.type === 'birdnet') {
      console.log('Creating BirdNET detection model');
      const { BirdNETDetectionModel } = await import('./detectionModelBirdNET');

      const birdnetConfig = {
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

  static async autoDetectAndCreate(threshold: number = 0.9): Promise<any> {
    console.log('Using BirdNET model as default');
    return await ModelFactory.createModel({
      type: 'birdnet',
      threshold,
    });
  }

  static async createBirdNETModel(threshold: number = 0.9): Promise<any> {
    console.log('Creating BirdNET model');
    return await ModelFactory.createModel({
      type: 'birdnet',
      threshold,
    });
  }
}
