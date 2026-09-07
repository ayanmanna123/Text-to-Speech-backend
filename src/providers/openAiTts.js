import { BaseTTSProvider } from './baseProvider.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/apiError.js';

export class OpenAiTtsProvider extends BaseTTSProvider {
  constructor() {
    super('openai');
    this.apiKey = env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1/audio/speech';
  }

  async generateSpeech({ text, voiceId = 'alloy', format = 'mp3', settings = {} }) {
    if (!this.apiKey || this.apiKey.startsWith('your-')) {
      logger.warn('OpenAI API key missing or placeholder. Returning simulated audio buffer for development.');
      return this._simulateAudioBuffer(text);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model || 'tts-1',
          input: text,
          voice: voiceId,
          response_format: format,
          speed: settings.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, `OpenAI Speech API Error: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        audioBuffer: Buffer.from(arrayBuffer),
        contentType: `audio/${format}`,
        provider: this.name,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, `OpenAI TTS Failed: ${err.message}`);
    }
  }

  async getVoices() {
    return [
      { id: 'alloy', name: 'Alloy', provider: 'openai', gender: 'neutral', accent: 'american', category: 'versatile' },
      { id: 'echo', name: 'Echo', provider: 'openai', gender: 'male', accent: 'american', category: 'warm' },
      { id: 'fable', name: 'Fable', provider: 'openai', gender: 'neutral', accent: 'british', category: 'expressive' },
      { id: 'onyx', name: 'Onyx', provider: 'openai', gender: 'male', accent: 'american', category: 'deep' },
      { id: 'nova', name: 'Nova', provider: 'openai', gender: 'female', accent: 'american', category: 'energetic' },
      { id: 'shimmer', name: 'Shimmer', provider: 'openai', gender: 'female', accent: 'american', category: 'clear' },
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
      const sample = Math.sin(2 * Math.PI * 523.25 * t) * 8000;
      buffer.writeInt16LE(Math.floor(sample), headerByteLength + i * 2);
    }

    return {
      audioBuffer: buffer,
      contentType: 'audio/wav',
      provider: 'openai_simulated',
    };
  }
}
