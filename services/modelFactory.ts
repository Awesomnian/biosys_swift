import { SwiftParrotDetectionModel as MockModel } from './detectionModel';
import {
  SwiftParrotDetectionModel as TensorFlowModel,
  ModelConfig,
} from './detectionModelTensorFlow';

export type ModelType = 'mock' | 'tensorflow';

export interface ModelFactoryConfig {
  type: ModelType;
  threshold?: number;
  modelPath?: string;
}

export class ModelFactory {
  static async createModel(
    config: ModelFactoryConfig
  ): Promise<MockModel | TensorFlowModel> {
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

    throw new Error(`Unknown model type: ${config.type}`);
  }

  static async autoDetectAndCreate(
    threshold: number = 0.9
  ): Promise<MockModel | TensorFlowModel> {
    const defaultModelPath = '/models/swift-parrot/model.json';

    try {
      const response = await fetch(defaultModelPath, { method: 'HEAD' });

      if (response.ok) {
        console.log('TensorFlow model detected, using production model');
        return await ModelFactory.createModel({
          type: 'tensorflow',
          modelPath: defaultModelPath,
          threshold,
        });
      }
    } catch (error) {
      console.log('TensorFlow model not found, using mock model');
    }

    return await ModelFactory.createModel({
      type: 'mock',
      threshold,
    });
  }
}
