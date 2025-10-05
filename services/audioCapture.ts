import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Audio segment captured from microphone
 * Changed from blob to uri for FileSystem.uploadAsync() compatibility
 */
export interface AudioSegment {
  uri: string;  // Changed from blob: Blob - now returns file URI for direct upload
  timestamp: Date;
  duration: number;
}

/**
 * Audio Capture Service
 * 
 * Continuously records 5-second audio segments in WAV format for BirdNET analysis.
 * Uses WAV format (BirdNET's preferred format) instead of .m4a for better compatibility.
 */
export class AudioCaptureService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private segmentDuration: number;
  private onSegmentReady: (segment: AudioSegment) => void;
  private recordingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    segmentDuration: number = 5000,
    onSegmentReady: (segment: AudioSegment) => void
  ) {
    this.segmentDuration = segmentDuration;
    this.onSegmentReady = onSegmentReady;
  }

  async start(): Promise<void> {
    console.log('🎤 AudioCaptureService.start() CALLED');
    console.log('  📊 Current isRecording:', this.isRecording);
    
    if (this.isRecording) {
      console.log('  ⚠️ Already recording, returning');
      return;
    }

    try {
      console.log('  🔧 Step 1: Requesting microphone permission (5s timeout)...');
      
      const permissionPromise = Audio.requestPermissionsAsync();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Microphone permission timeout')), 5000)
      );
      
      const permission = await Promise.race([permissionPromise, timeoutPromise]) as any;
      
      console.log('  📊 Permission result:', {
        granted: permission?.granted,
        canAskAgain: permission?.canAskAgain,
        status: permission?.status
      });
      
      if (!permission || !permission.granted) {
        console.error('  ❌ Microphone permission DENIED or TIMEOUT');
        throw new Error('Microphone permission not granted');
      }
      console.log('  ✅ Microphone permission granted');

      console.log('  🔧 Step 2: Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log('  ✅ Audio mode set');

      console.log('  🔧 Step 3: Setting isRecording = true...');
      this.isRecording = true;
      console.log('  ✅ isRecording set');

      console.log('  🔧 Step 4: Starting first audio segment...');
      await this.startNewSegment();
      console.log('  ✅ First segment started');
      
      console.log('✅ AudioCaptureService.start() COMPLETE');
    } catch (error) {
      console.error('❌ AudioCaptureService.start() FAILED:', error);
      console.error('  Error type:', typeof error);
      console.error('  Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async startNewSegment(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      const segmentStartTime = Date.now();

      // Record audio in M4A format - more reliable on Android
      // BirdNET can process M4A/AAC files
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      this.recording = recording;

      this.recordingTimer = setTimeout(async () => {
        const currentRecording = this.recording;
        if (currentRecording && this.isRecording) {
          try {
            const uri = currentRecording.getURI();
            await currentRecording.stopAndUnloadAsync();
            this.recording = null;

            if (uri) {
              const fileInfo = await FileSystem.getInfoAsync(uri);
              if (fileInfo.exists) {
                const duration = Date.now() - segmentStartTime;

                // Pass file URI directly - no blob conversion needed
                // FileSystem.uploadAsync() works with file URIs
                this.onSegmentReady({
                  uri,
                  timestamp: new Date(segmentStartTime),
                  duration,
                });

                // Note: File will be deleted by detection service after upload
                // Don't delete here to ensure FileSystem.uploadAsync() can access it
              }
            }

            if (this.isRecording) {
              await this.startNewSegment();
            }
          } catch (error) {
            console.error('Error stopping segment:', error);
            this.recording = null;
            if (this.isRecording) {
              await this.startNewSegment();
            }
          }
        }
      }, this.segmentDuration);
    } catch (error) {
      console.error('Failed to start new segment:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRecording = false;

    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.recording) {
      try {
        const uri = this.recording.getURI();
        await this.recording.stopAndUnloadAsync();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
      this.recording = null;
    }
  }

  isActive(): boolean {
    return this.isRecording;
  }
}
