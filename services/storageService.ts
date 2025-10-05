import { supabase, Detection } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PendingDetection {
  id: string;
  audioBlob: Blob;
  metadata: Omit<Detection, 'id' | 'audio_file_url'>;
}

export class StorageService {
  private pendingQueue: PendingDetection[] = [];
  private maxStorageMB: number = 100;
  private isUploading: boolean = false;

  async initialize(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('pending_detections');
      if (saved) {
        this.pendingQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load pending detections:', error);
    }
  }

  async saveDetection(
    audioBlob: Blob,
    metadata: Omit<Detection, 'id' | 'audio_file_url'>
  ): Promise<void> {
    const detection: PendingDetection = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      audioBlob,
      metadata,
    };

    this.pendingQueue.push(detection);
    await this.persistQueue();

    if (navigator.onLine) {
      this.attemptUpload();
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      const serializable = this.pendingQueue.map((d) => ({
        ...d,
        audioBlob: null,
      }));
      await AsyncStorage.setItem('pending_detections', JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  async attemptUpload(): Promise<void> {
    if (this.isUploading || this.pendingQueue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isUploading = true;

    try {
      while (this.pendingQueue.length > 0 && navigator.onLine) {
        const detection = this.pendingQueue[0];
        await this.uploadDetection(detection);
        this.pendingQueue.shift();
        await this.persistQueue();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      this.isUploading = false;
    }
  }

  private async uploadDetection(detection: PendingDetection): Promise<void> {
    const fileName = `${detection.metadata.device_id}/${detection.id}.webm`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-detections')
      .upload(fileName, detection.audioBlob, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('audio-detections')
      .getPublicUrl(fileName);

    const { error: dbError } = await supabase
      .from('detections')
      .insert({
        ...detection.metadata,
        audio_file_url: urlData.publicUrl,
      });

    if (dbError) {
      throw dbError;
    }
  }

  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  async clearAll(): Promise<void> {
    this.pendingQueue = [];
    await this.persistQueue();
  }
}
