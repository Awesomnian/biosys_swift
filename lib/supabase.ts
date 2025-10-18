import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Make supabase client resilient at import time so the app doesn't throw during builds
// if `expoConfig.extra` isn't populated (e.g. in some CI or web builds).
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

let _supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    _supabaseClient = null;
  }
} else {
  console.warn('Supabase credentials not found in Constants.expoConfig.extra. Supabase client not initialized.');
}

export const supabase = _supabaseClient as ReturnType<typeof createClient> | null;

export interface Detection {
  id?: string;
  device_id: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  model_name: string;
  confidence: number;
  audio_file_url?: string;
  uploaded_at?: string;
  created_at?: string;
}

export interface SensorStatus {
  device_id: string;
  last_seen?: string;
  battery_level?: number;
  storage_used_mb?: number;
  total_detections?: number;
  status?: 'active' | 'offline' | 'error';
  updated_at?: string;
}
