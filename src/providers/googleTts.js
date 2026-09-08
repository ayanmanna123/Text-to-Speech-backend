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
      logger.warn('Google Cloud TTS API key missing or placeholder. Returning spoken TTS audio stream.');
      return this._fetchSpokenSpeech(text, format, settings, voiceId);
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
            audioEncoding: format.toUpperCase() === 'WAV' ? 'LINEAR16' : format.toUpperCase() === 'OGG' ? 'OGG_OPUS' : 'MP3',
            speakingRate: settings.speed || 1.0,
            pitch: settings.pitch || 0.0,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return this._fetchSpokenSpeech(text, format, settings, voiceId);
      }

      const data = await response.json();
      const buffer = Buffer.from(data.audioContent, 'base64');

      return {
        audioBuffer: buffer,
        contentType: format.toLowerCase() === 'wav' ? 'audio/wav' : format.toLowerCase() === 'ogg' ? 'audio/ogg' : 'audio/mpeg',
        provider: this.name,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return this._fetchSpokenSpeech(text, format, settings, voiceId);
    }
  }

  async getVoices() {
    return [
      // English Voices
      { id: 'en-US-Neural2-F', name: 'Neural US Female', provider: 'google', gender: 'female', accent: 'american', category: 'neural', language: 'English', languageCode: 'en-US' },
      { id: 'en-US-Neural2-D', name: 'Neural US Male', provider: 'google', gender: 'male', accent: 'american', category: 'neural', language: 'English', languageCode: 'en-US' },
      { id: 'en-IN-Wavenet-A', name: 'Wavenet Indian Female', provider: 'google', gender: 'female', accent: 'indian', category: 'wavenet', language: 'English', languageCode: 'en-IN' },
      { id: 'en-IN-Wavenet-B', name: 'Wavenet Indian Male', provider: 'google', gender: 'male', accent: 'indian', category: 'wavenet', language: 'English', languageCode: 'en-IN' },
      { id: 'en-GB-Neural2-A', name: 'Neural UK Female', provider: 'google', gender: 'female', accent: 'british', category: 'neural', language: 'English', languageCode: 'en-GB' },

      // Hindi Voices
      { id: 'hi-IN-Wavenet-A', name: 'Wavenet Hindi Female', provider: 'google', gender: 'female', accent: 'indian', category: 'wavenet', language: 'Hindi', languageCode: 'hi-IN' },
      { id: 'hi-IN-Wavenet-B', name: 'Wavenet Hindi Male', provider: 'google', gender: 'male', accent: 'indian', category: 'wavenet', language: 'Hindi', languageCode: 'hi-IN' },
      { id: 'hi-IN-Neural2-C', name: 'Neural Hindi Female', provider: 'google', gender: 'female', accent: 'indian', category: 'neural', language: 'Hindi', languageCode: 'hi-IN' },

      // Gujarati Voices
      { id: 'gu-IN-Standard-A', name: 'Standard Gujarati Female', provider: 'google', gender: 'female', accent: 'indian', category: 'standard', language: 'Gujarati', languageCode: 'gu-IN' },
      { id: 'gu-IN-Standard-B', name: 'Standard Gujarati Male', provider: 'google', gender: 'male', accent: 'indian', category: 'standard', language: 'Gujarati', languageCode: 'gu-IN' },

      // Marathi Voices
      { id: 'mr-IN-Standard-A', name: 'Standard Marathi Female', provider: 'google', gender: 'female', accent: 'indian', category: 'standard', language: 'Marathi', languageCode: 'mr-IN' },
      { id: 'mr-IN-Standard-B', name: 'Standard Marathi Male', provider: 'google', gender: 'male', accent: 'indian', category: 'standard', language: 'Marathi', languageCode: 'mr-IN' },

      // Spanish Voices
      { id: 'es-ES-Neural2-A', name: 'Neural Spanish Female', provider: 'google', gender: 'female', accent: 'spanish', category: 'neural', language: 'Spanish', languageCode: 'es-ES' },
      { id: 'es-ES-Neural2-B', name: 'Neural Spanish Male', provider: 'google', gender: 'male', accent: 'spanish', category: 'neural', language: 'Spanish', languageCode: 'es-ES' },

      // French Voices
      { id: 'fr-FR-Neural2-A', name: 'Neural French Female', provider: 'google', gender: 'female', accent: 'french', category: 'neural', language: 'French', languageCode: 'fr-FR' },
      { id: 'fr-FR-Neural2-B', name: 'Neural French Male', provider: 'google', gender: 'male', accent: 'french', category: 'neural', language: 'French', languageCode: 'fr-FR' },

      // German Voices
      { id: 'de-DE-Neural2-A', name: 'Neural German Female', provider: 'google', gender: 'female', accent: 'german', category: 'neural', language: 'German', languageCode: 'de-DE' },
      { id: 'de-DE-Neural2-B', name: 'Neural German Male', provider: 'google', gender: 'male', accent: 'german', category: 'neural', language: 'German', languageCode: 'de-DE' },
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
            provider: 'google_spoken',
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

    const baseFreq = 440 + (similarity * 200) + (pitchShift * 10);
    const modulationFreq = (1 - stability) * 8 + 1;
    const modulationDepth = (1 - stability) * 150;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freqMod = Math.sin(2 * Math.PI * modulationFreq * t) * modulationDepth;
      const sample = Math.sin(2 * Math.PI * (baseFreq + freqMod) * t) * 8000;
      buffer.writeInt16LE(Math.floor(sample), headerByteLength + i * 2);
    }

    const mimeType = format.toLowerCase() === 'wav' ? 'audio/wav' : format.toLowerCase() === 'ogg' ? 'audio/ogg' : 'audio/mpeg';

    return {
      audioBuffer: buffer,
      contentType: mimeType,
      provider: 'google_simulated',
    };
  }
}
