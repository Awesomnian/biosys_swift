import { supabase, Detection } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface PendingDetection {
  id: string;
  audioUri: string;
  metadata: Omit<Detection, 'id' | 'audio_file_url'>;
}

export class StorageService {
  private pendingQueue: PendingDetection[] = [];
  private isUploading: boolean = false;
  private audioDirectory: string;

  constructor() {
    this.audioDirectory = `${FileSystem.documentDirectory}audio/`;
  }

  async initialize(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('pending_detections');
      if (saved) {
        this.pendingQueue = JSON.parse(saved);
      }
      
      await this.cleanupOldFiles();
    } catch (error) {
      console.error('Failed to load pending detections:', error);
    }
  }

  async saveDetection(
    audioUri: string,
    metadata: Omit<Detection, 'id' | 'audio_file_url'>
  ): Promise<void> {
    const detection: PendingDetection = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      audioUri,
      metadata,
    };

    this.pendingQueue.push(detection);
    await this.persistQueue();
    
    this.attemptUpload();
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('pending_detections', JSON.stringify(this.pendingQueue));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  async attemptUpload(): Promise<void> {
    if (this.isUploading || this.pendingQueue.length === 0) {
      return;
    }

    this.isUploading = true;

    try {
      while (this.pendingQueue.length > 0) {
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
    console.log('📤 Uploading detection to Supabase...');
    console.log('  🎵 File URI:', detection.audioUri);
    
    const fileInfo = await FileSystem.getInfoAsync(detection.audioUri);
    if (!fileInfo.exists) {
      console.error('  ❌ File not found:', detection.audioUri);
      return;
    }
    
    console.log('  📦 File size:', fileInfo.size, 'bytes');

    const fileName = `${detection.metadata.device_id}/${detection.id}.m4a`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/detections/${fileName}`;
    
    console.log('  ☁️ Uploading to:', uploadUrl);

    const response = await FileSystem.uploadAsync(uploadUrl, detection.audioUri, {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      httpMethod: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (response.status !== 200) {
      console.error('  ❌ Upload failed:', response.status, response.body);
      throw new Error(`Upload failed: ${response.status}`);
    }

    console.log('  ✅ Upload complete');
    
    await FileSystem.deleteAsync(detection.audioUri, { idempotent: true });
    console.log('  🗑️ Local file deleted after successful upload');

    const { data: urlData } = supabase.storage
      .from('detections')
      .getPublicUrl(fileName);

    console.log('  🔗 Public URL:', urlData.publicUrl);

    console.log('  💾 Saving to database...');
    const { error: dbError } = await supabase
      .from('detections')
      .insert({
        ...detection.metadata,
        audio_file_url: urlData.publicUrl,
      });

    if (dbError) {
      console.error('  ❌ Database error:', dbError);
      throw dbError;
    }

    console.log('  ✅ Detection saved successfully! 🎉');
  }

  async cleanupOldFiles(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.audioDirectory);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(this.audioDirectory);
      const now = Date.now();
      const maxAge = 48 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const fileUri = this.audioDirectory + file;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (fileInfo.exists && fileInfo.modificationTime) {
          const age = now - fileInfo.modificationTime * 1000;
          if (age > maxAge) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
            deletedCount++;
          }
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} old audio files`);
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
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