import { BirdNETDetectionModel } from './detectionModelBirdNET';
import { DetectionModel } from './detectionModel';

export interface ModelFactoryConfig {
  threshold?: number;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export class ModelFactory {
  static async createModel(config: ModelFactoryConfig): Promise<DetectionModel> {
    const threshold = config.threshold || 0.8;

    console.log('🔧 ModelFactory.createModel(): Creating BirdNET...');

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

  static async autoDetectAndCreate(threshold: number = 0.8): Promise<DetectionModel> {
    console.log('🔧 ModelFactory.autoDetectAndCreate() START');
    console.log('  📊 Input threshold:', threshold);

    try {
      console.log('  🔧 Calling ModelFactory.createModel()...');
      const model = await ModelFactory.createModel({
        threshold,
      });
      console.log('  ✅ createModel() returned successfully');
      console.log('    - Model type:', typeof model);

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

  static async createBirdNETModel(threshold: number = 0.8): Promise<DetectionModel> {
    console.log('Creating BirdNET model');
    return await ModelFactory.createModel({
      threshold,
    });
  }
}
