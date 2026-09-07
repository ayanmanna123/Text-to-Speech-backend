import { BaseTTSProvider } from './baseProvider.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/apiError.js';

export class GoogleTtsProvider extends BaseTTSProvider {
  constructor() {
    super('google');
    this.apiKey = env.GOOGLE_TTS_API_KEY;
  }

  async generateSpeech({ text, voiceId = 'en-US-Neural2-F', format = 'mp3', settings = {} }) {
    if (!this.apiKey || this.apiKey.startsWith('your-')) {
      logger.warn('Google Cloud TTS API key missing or placeholder. Returning simulated audio buffer for development.');
      return this._simulateAudioBuffer(text);
    }

    try {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: settings.languageCode || 'en-US',
            name: voiceId,
          },
          audioConfig: {
            audioEncoding: format.toUpperCase() === 'WAV' ? 'LINEAR16' : 'MP3',
            speakingRate: settings.speakingRate || 1.0,
            pitch: settings.pitch || 0.0,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, `Google Cloud TTS API Error: ${errorText}`);
      }

      const data = await response.json();
      const buffer = Buffer.from(data.audioContent, 'base64');

      return {
        audioBuffer: buffer,
        contentType: format.toLowerCase() === 'wav' ? 'audio/wav' : 'audio/mpeg',
        provider: this.name,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, `Google TTS Failed: ${err.message}`);
    }
  }

  async getVoices() {
    return [
      { id: 'en-US-Neural2-F', name: 'Neural US Female', provider: 'google', gender: 'female', accent: 'american', category: 'neural' },
      { id: 'en-US-Neural2-D', name: 'Neural US Male', provider: 'google', gender: 'male', accent: 'american', category: 'neural' },
      { id: 'en-GB-Neural2-A', name: 'Neural UK Female', provider: 'google', gender: 'female', accent: 'british', category: 'neural' },
      { id: 'en-AU-Neural2-B', name: 'Neural AU Male', provider: 'google', gender: 'male', accent: 'australian', category: 'neural' },
    ];
  }

  _simulateAudioBuffer(text) {
    const sampleRate = 44100;
    const durationSec = Math.max(1, Math.min(10, Math.ceil(text.length / 15)));
    const numSamples = sampleRate * durationSec;
    const headerByteLength = 44;
    const buffer = Buffer.alloc(headerByteLength + numSamples * 2);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 659.25 * t) * 7000;
      buffer.writeInt16LE(Math.floor(sample), headerByteLength + i * 2);
    }

    return {
      audioBuffer: buffer,
      contentType: 'audio/wav',
      provider: 'google_simulated',
    };
  }
}
