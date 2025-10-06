import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export interface AudioSegment {
  uri: string;
  timestamp: Date;
  duration: number;
}

/**
 * Audio Capture Service
 * 
 * Records 5-second audio segments in M4A format.
 * M4A is converted to WAV server-side before BirdNET analysis.
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
      console.log('  ✅ Microphone permission assumed (manually granted)');

      console.log('  🔧 Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log('  ✅ Audio mode set');

      console.log('  🔧 Setting isRecording = true...');
      this.isRecording = true;
      console.log('  ✅ isRecording set');

      console.log('  🔧 Starting first audio segment...');
      await this.startNewSegment();
      console.log('  ✅ First segment started');
      
      console.log('✅ AudioCaptureService.start() COMPLETE');
    } catch (error) {
      console.error('❌ AudioCaptureService.start() FAILED:', error);
      throw error;
    }
  }

  private async startNewSegment(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      const segmentStartTime = Date.now();

      // Record in M4A - converted to WAV server-side
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 48000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 48000,
          numberOfChannels: 1,
          bitRate: 128000,
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

                this.onSegmentReady({
                  uri,
                  timestamp: new Date(segmentStartTime),
                  duration,
                });
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