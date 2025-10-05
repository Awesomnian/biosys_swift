import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export interface AudioSegment {
  blob: Blob;
  timestamp: Date;
  duration: number;
}

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
    if (this.isRecording) {
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      this.isRecording = true;
      await this.startNewSegment();
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  private async startNewSegment(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      const segmentStartTime = Date.now();

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
                const blob = await this.uriToBlob(uri);
                const duration = Date.now() - segmentStartTime;

                this.onSegmentReady({
                  blob,
                  timestamp: new Date(segmentStartTime),
                  duration,
                });

                await FileSystem.deleteAsync(uri, { idempotent: true });
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

  private async uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return await response.blob();
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
