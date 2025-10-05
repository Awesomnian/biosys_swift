import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

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
