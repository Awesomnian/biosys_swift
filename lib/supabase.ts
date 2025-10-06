import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in app.json extra config');
  console.error('   Expected: Constants.expoConfig.extra.supabaseUrl');
  console.error('   Expected: Constants.expoConfig.extra.supabaseAnonKey');
  throw new Error('Supabase credentials not configured in app.json');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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