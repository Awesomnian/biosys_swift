export interface AudioSegment {
  blob: Blob;
  timestamp: Date;
  duration: number;
}

export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private isRecording = false;
  private segmentDuration: number;
  private onSegmentReady: (segment: AudioSegment) => void;

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
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm',
      });

      const audioChunks: Blob[] = [];
      const segmentStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const duration = Date.now() - segmentStartTime;

          this.onSegmentReady({
            blob: audioBlob,
            timestamp: new Date(segmentStartTime),
            duration,
          });

          audioChunks.length = 0;
        }

        if (this.isRecording) {
          this.startNewSegment();
        }
      };

      this.isRecording = true;
      this.startNewSegment();
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  private startNewSegment(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.start();
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, this.segmentDuration);
    }
  }

  stop(): void {
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    this.mediaRecorder = null;
  }

  isActive(): boolean {
    return this.isRecording;
  }
}
