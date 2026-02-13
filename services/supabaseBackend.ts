import { supabase, Detection } from '../lib/supabase';
import { BackendService } from './backendService';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase implementation of the BackendService interface.
 */
export class SupabaseBackend implements BackendService {
  isConfigured(): boolean {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY && supabase);
  }

  async uploadAudio(fileUri: string, fileName: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Supabase is not configured. Please set supabaseUrl and supabaseAnonKey in app.json');
    }

    const uploadUrl = `${SUPABASE_URL!.replace(/\/$/, '')}/storage/v1/object/detections/${fileName}`;

    console.log('  ☁️ Uploading to:', uploadUrl);

    const response = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      httpMethod: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Upload failed: ${response.status} - ${response.body}`);
    }

    console.log('  ✅ Upload complete');

    // Get public URL
    const { data: urlData } = supabase!.storage
      .from('detections')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async saveDetection(
    detection: Omit<Detection, 'id' | 'audio_file_url'>,
    audioUrl: string
  ): Promise<Detection> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    console.log('  💾 Saving to database...');

    const { data, error } = await supabase
      .from('detections')
      .insert({
        ...detection,
        audio_file_url: audioUrl,
      } as any)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('  ✅ Detection saved successfully!');

    return data as Detection;
  }

  async getDetections(limit: number): Promise<Detection[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('detections')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as Detection[]) || [];
  }

  async analyzeAudio(storagePath: string, bucket: string): Promise<{
    confidence: number;
    isPositive: boolean;
    species?: string;
  } | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('  ⚠️ Supabase config missing; cannot trigger Edge Function for analysis');
      return null;
    }

    try {
      const functionUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/analyze-birdcall`;
      console.log('  🔁 Triggering Edge Function for analysis:', functionUrl);

      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ storagePath, bucket }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn('  ⚠️ Edge function returned non-OK status:', res.status, text);
        return null;
      }

      const json = await res.json();
      console.log('  ✅ Edge function analysis complete:', json);
      return {
        confidence: json.confidence,
        isPositive: json.isPositive,
        species: json.species,
      };
    } catch (err) {
      console.error('  ❌ Failed to call Edge Function:', err);
      return null;
    }
  }
}

// Singleton instance
let backendInstance: BackendService | null = null;

export function getBackend(): BackendService {
  if (!backendInstance) {
    backendInstance = new SupabaseBackend();
  }
  return backendInstance;
}

export function setBackend(backend: BackendService): void {
  backendInstance = backend;
}
