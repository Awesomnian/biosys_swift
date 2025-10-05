import Meyda, { MeydaFeaturesObject } from 'meyda';

export interface SpectrogramConfig {
  sampleRate: number;
  frameSize: number;
  hopSize: number;
  melBands: number;
  targetFrames: number;
}

export const DEFAULT_SPECTROGRAM_CONFIG: SpectrogramConfig = {
  sampleRate: 22050,
  frameSize: 2048,
  hopSize: 512,
  melBands: 128,
  targetFrames: 128,
};

export class AudioPreprocessor {
  private config: SpectrogramConfig;

  constructor(config: SpectrogramConfig = DEFAULT_SPECTROGRAM_CONFIG) {
    this.config = config;
  }

  async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({
      sampleRate: this.config.sampleRate,
    });
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  extractMelSpectrogram(audioBuffer: AudioBuffer): number[][][] {
    const channelData = audioBuffer.getChannelData(0);
    const { frameSize, hopSize, melBands, targetFrames, sampleRate } = this.config;

    const spectrograms: number[][] = [];

    for (let i = 0; i <= channelData.length - frameSize; i += hopSize) {
      const frame = Array.from(channelData.slice(i, i + frameSize));

      const features = Meyda.extract('melBands', frame, {
        melBands,
        sampleRate,
        bufferSize: frameSize,
      }) as number[] | null;

      if (features) {
        spectrograms.push(features);
      }

      if (spectrograms.length >= targetFrames) {
        break;
      }
    }

    while (spectrograms.length < targetFrames) {
      spectrograms.push(new Array(melBands).fill(0));
    }

    const normalized = this.normalizeSpectrogram(spectrograms);

    return [normalized];
  }

  private normalizeSpectrogram(spectrogram: number[][]): number[][] {
    const flat = spectrogram.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const range = max - min;

    if (range === 0) {
      return spectrogram.map((frame) => frame.map(() => 0));
    }

    return spectrogram.map((frame) =>
      frame.map((value) => (value - min) / range)
    );
  }

  getInputShape(): [number, number, number, number] {
    const { targetFrames, melBands } = this.config;
    return [1, targetFrames, melBands, 1];
  }
}
