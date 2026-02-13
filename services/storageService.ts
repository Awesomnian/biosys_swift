import { supabase, Detection } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

// Prefer expo constants (app.json extra) for runtime config; fall back to process.env
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface PendingDetection {
  id: string;
  audioUri: string;
  metadata: Omit<Detection, 'id' | 'audio_file_url'>;
  retryCount?: number;
}

const MAX_RETRIES = 10;

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
        
        // Check retry count
        if ((detection.retryCount || 0) >= MAX_RETRIES) {
          console.warn(`Detection ${detection.id} exceeded max retries (${MAX_RETRIES}), removing from queue`);
          this.pendingQueue.shift();
          await this.persistQueue();
          continue;
        }
        
        try {
          await this.uploadDetection(detection);
          // Only remove from queue after successful upload
          this.pendingQueue.shift();
          await this.persistQueue();
        } catch (uploadError) {
          console.error('Upload failed for detection, will retry later:', uploadError);
          // Increment retry count
          detection.retryCount = (detection.retryCount || 0) + 1;
          await this.persistQueue();
          break; // Stop processing queue, retry next time
        }
      }
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
      throw new Error(`File not found: ${detection.audioUri}`);
    }
    
    console.log('  📦 File size:', fileInfo.size, 'bytes');

    const fileName = `${detection.metadata.device_id}/${detection.id}.m4a`;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('  ❌ Supabase URL or ANON key missing. Cannot upload file now. Will retry later.');
      throw new Error('Supabase URL or ANON key missing');
    }

    const uploadUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/detections/${fileName}`;

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

    if (response.status < 200 || response.status >= 300) {
      console.error('  ❌ Upload failed:', response.status, response.body);
      throw new Error(`Upload failed: ${response.status}`);
    }

    console.log('  ✅ Upload complete');
    
    await FileSystem.deleteAsync(detection.audioUri, { idempotent: true });
    console.log('  🗑️ Local file deleted after successful upload');

    if (!supabase) {
      console.warn('Supabase client not initialized; skipping DB save');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('detections')
      .getPublicUrl(fileName);

    console.log('  🔗 Public URL:', urlData.publicUrl);

    console.log('  💾 Saving to database...');
    // Cast to any to avoid strict PostgREST typing issues in this small POC
    const { error: dbError } = await supabase
      .from('detections')
      .insert({
        ...detection.metadata,
        audio_file_url: urlData.publicUrl,
      } as any);

    if (dbError) {
      console.error('  ❌ Database error:', dbError);
      throw dbError;
    }

    console.log('  ✅ Detection saved successfully! 🎉');

    // Trigger server-side analysis via Supabase Edge Function if configured.
    try {
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        const functionUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/analyze-birdcall`;
        console.log('  🔁 Triggering Edge Function for analysis:', functionUrl);

        const res = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ storagePath: fileName, bucket: 'detections' }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn('  ⚠️ Edge function returned non-OK status:', res.status, text);
        } else {
          const json = await res.json().catch(() => null);
          console.log('  ✅ Edge function analysis queued/returned:', json);
        }
      } else {
        console.warn('  ⚠️ Supabase config missing; cannot trigger Edge Function for analysis');
      }
    } catch (err) {
      console.error('  ❌ Failed to call Edge Function:', err);
    }
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