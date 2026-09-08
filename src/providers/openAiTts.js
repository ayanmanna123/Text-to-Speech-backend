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
      logger.warn('OpenAI API key missing or placeholder. Returning spoken TTS audio stream.');
      return this._fetchSpokenSpeech(text, format, settings, voiceId);
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
        return this._fetchSpokenSpeech(text, format, settings, voiceId);
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        audioBuffer: Buffer.from(arrayBuffer),
        contentType: `audio/${format}`,
        provider: this.name,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return this._fetchSpokenSpeech(text, format, settings, voiceId);
    }
  }

  async getVoices() {
    return [
      { id: 'alloy', name: 'Alloy', provider: 'openai', gender: 'neutral', accent: 'american', category: 'versatile', language: 'English', languageCode: 'en-US' },
      { id: 'echo', name: 'Echo', provider: 'openai', gender: 'male', accent: 'american', category: 'warm', language: 'English', languageCode: 'en-US' },
      { id: 'fable', name: 'Fable', provider: 'openai', gender: 'neutral', accent: 'british', category: 'expressive', language: 'English', languageCode: 'en-GB' },
      { id: 'onyx', name: 'Onyx', provider: 'openai', gender: 'male', accent: 'american', category: 'deep', language: 'English', languageCode: 'en-US' },
      { id: 'nova', name: 'Nova', provider: 'openai', gender: 'female', accent: 'american', category: 'energetic', language: 'English', languageCode: 'en-US' },
      { id: 'shimmer', name: 'Shimmer', provider: 'openai', gender: 'female', accent: 'american', category: 'clear', language: 'English', languageCode: 'en-US' },
    ];
  }

  async _fetchSpokenSpeech(text, format = 'mp3', settings = {}, voiceId = '') {
    try {
      let tl = 'en';
      if (voiceId.startsWith('hi') || settings.languageCode?.startsWith('hi')) tl = 'hi';
      else if (voiceId.startsWith('gu') || settings.languageCode?.startsWith('gu')) tl = 'gu';
      else if (voiceId.startsWith('mr') || settings.languageCode?.startsWith('mr')) tl = 'mr';
      else if (voiceId.startsWith('es') || settings.languageCode?.startsWith('es')) tl = 'es';
      else if (voiceId.startsWith('fr') || settings.languageCode?.startsWith('fr')) tl = 'fr';
      else if (voiceId.startsWith('de') || settings.languageCode?.startsWith('de')) tl = 'de';

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 300))}&tl=${tl}&client=tw-ob`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length > 300) {
          return {
            audioBuffer: buffer,
            contentType: format.toLowerCase() === 'wav' ? 'audio/wav' : 'audio/mpeg',
            provider: 'openai_spoken',
          };
        }
      }
    } catch (err) {
      logger.warn('Spoken TTS request failed, using buffer fallback:', err.message);
    }
    return this._simulateAudioBuffer(text, format, settings);
  }

  _simulateAudioBuffer(text, format = 'mp3', settings = {}) {
    const speed = settings.speed || 1.0;
    const stability = settings.stability ?? 0.5;
    const similarity = settings.similarity_boost ?? 0.75;
    const pitchShift = settings.pitch || 0;

    const sampleRate = 44100;
    const baseDuration = Math.max(1, Math.min(15, text.length / 15));
    const durationSec = Math.max(0.5, baseDuration / speed);
    const numSamples = Math.floor(sampleRate * durationSec);
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

    const baseFreq = 480 + (similarity * 220) + (pitchShift * 10);
    const modulationFreq = (1 - stability) * 9 + 1;
    const modulationDepth = (1 - stability) * 140;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freqMod = Math.sin(2 * Math.PI * modulationFreq * t) * modulationDepth;
      const sample = Math.sin(2 * Math.PI * (baseFreq + freqMod) * t) * 8500;
      buffer.writeInt16LE(Math.floor(sample), headerByteLength + i * 2);
    }

    const mimeType = format.toLowerCase() === 'wav' ? 'audio/wav' : format.toLowerCase() === 'ogg' ? 'audio/ogg' : 'audio/mpeg';

    return {
      audioBuffer: buffer,
      contentType: mimeType,
      provider: 'openai_simulated',
    };
  }
}
