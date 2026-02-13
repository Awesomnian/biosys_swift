import { Detection } from '../lib/supabase';

/**
 * Backend service interface for abstracting data storage operations.
 * This allows swapping backends (Supabase, Firebase, custom API) without
 * modifying the StorageService logic.
 */
export interface BackendService {
  /**
   * Upload an audio file to storage.
   * @param fileUri Local file URI
   * @param fileName Remote file name/path
   * @returns Public URL of the uploaded file
   */
  uploadAudio(fileUri: string, fileName: string): Promise<string>;

  /**
   * Save a detection record to the database.
   * @param detection Detection data (without id and audio_file_url)
   * @param audioUrl URL of the uploaded audio file
   * @returns The saved detection with id
   */
  saveDetection(detection: Omit<Detection, 'id' | 'audio_file_url'>, audioUrl: string): Promise<Detection>;

  /**
   * Retrieve recent detections.
   * @param limit Maximum number of detections to return
   * @returns Array of detections
   */
  getDetections(limit: number): Promise<Detection[]>;

  /**
   * Trigger server-side analysis of an uploaded audio file.
   * @param storagePath Path to the audio file in storage
   * @param bucket Storage bucket name
   * @returns Analysis result or void
   */
  analyzeAudio?(storagePath: string, bucket: string): Promise<{
    confidence: number;
    isPositive: boolean;
    species?: string;
  } | null>;

  /**
   * Check if the backend is configured and available.
   */
  isConfigured(): boolean;
}
