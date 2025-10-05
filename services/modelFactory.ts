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
      console.log('🔧 ModelFactory.createModel(): Creating BirdNET...');
      console.log('  📦 Importing BirdNETDetectionModel...');
      const { BirdNETDetectionModel } = await import('./detectionModelBirdNET');
      console.log('  ✅ Import successful');

      const birdnetConfig = {
        threshold,
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
      };
      console.log('  📋 Config prepared:', {
        threshold,
        hasSupabaseUrl: !!config.supabaseUrl,
        hasSupabaseKey: !!config.supabaseAnonKey
      });

      console.log('  🔧 Creating new BirdNETDetectionModel instance...');
      const model = new BirdNETDetectionModel(birdnetConfig);
      console.log('  ✅ Instance created');
      
      console.log('  🔧 Calling model.initialize()...');
      await model.initialize();
      console.log('  ✅ initialize() completed');
      
      console.log('✅ BirdNET model ready, returning');
      return model;
    }

    throw new Error(`Unknown model type: ${config.type}`);
  }

  static async autoDetectAndCreate(threshold: number = 0.9): Promise<any> {
    console.log('🔧 ModelFactory.autoDetectAndCreate() START');
    console.log('  📊 Input threshold:', threshold);
    
    try {
      console.log('  🔧 Calling ModelFactory.createModel()...');
      const model = await ModelFactory.createModel({
        type: 'birdnet',
        threshold,
      });
      console.log('  ✅ createModel() returned successfully');
      console.log('    - Model type:', typeof model);
      console.log('    - Model has initialize:', typeof model?.initialize === 'function');
      
      console.log('✅ ModelFactory.autoDetectAndCreate() COMPLETE');
      console.log('  📦 Returning model to caller');
      return model;
    } catch (error) {
      console.error('❌ ModelFactory.autoDetectAndCreate() FAILED');
      console.error('  Error:', error);
      console.error('  Error type:', typeof error);
      console.error('  Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  static async createBirdNETModel(threshold: number = 0.9): Promise<any> {
    console.log('Creating BirdNET model');
    return await ModelFactory.createModel({
      type: 'birdnet',
      threshold,
    });
  }
}
