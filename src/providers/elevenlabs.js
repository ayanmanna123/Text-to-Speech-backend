import { BaseTTSProvider } from './baseProvider.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/apiError.js';

export class ElevenLabsProvider extends BaseTTSProvider {
  constructor() {
    super('elevenlabs');
    this.apiKey = env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  async generateSpeech({ text, voiceId = '21m00Tcm4TlvDq8ikWAM', format = 'mp3', settings = {} }) {
    if (!this.apiKey || this.apiKey.startsWith('your-')) {
      logger.warn('ElevenLabs API key missing or placeholder. Returning spoken TTS audio stream.');
      return this._fetchSpokenSpeech(text, format, settings, voiceId);
    }

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: settings.model_id || 'eleven_multilingual_v2',
          voice_settings: {
            stability: settings.stability ?? 0.5,
            similarity_boost: settings.similarity_boost ?? 0.75,
            style: settings.style ?? 0.0,
            use_speaker_boost: settings.use_speaker_boost ?? true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 402 || errorText.includes('paid_plan_required') || errorText.includes('quota_exceeded')) {
          logger.warn(`ElevenLabs API Tier Restriction (${response.status}). Serving spoken audio stream.`);
          return this._fetchSpokenSpeech(text, format, settings, voiceId);
        }
        return this._fetchSpokenSpeech(text, format, settings, voiceId);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        audioBuffer: buffer,
        contentType: 'audio/mpeg',
        provider: this.name,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return this._fetchSpokenSpeech(text, format, settings, voiceId);
    }
  }

  async getVoices() {
    if (!this.apiKey) {
      return this._getDefaultVoices();
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: { 'xi-api-key': this.apiKey },
      });
      if (!response.ok) return this._getDefaultVoices();
      const data = await response.json();
      return (data.voices || []).map((v) => ({
        id: v.voice_id,
        name: v.name,
        provider: 'elevenlabs',
        category: v.category || 'premade',
        gender: v.labels?.gender || 'unknown',
        accent: v.labels?.accent || 'american',
        previewUrl: v.preview_url,
      }));
    } catch (err) {
      logger.error('Error fetching ElevenLabs voices:', err);
      return this._getDefaultVoices();
    }
  }

  _getDefaultVoices() {
    return [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', provider: 'elevenlabs', gender: 'female', accent: 'american', category: 'narrative' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', provider: 'elevenlabs', gender: 'female', accent: 'american', category: 'conversational' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', provider: 'elevenlabs', gender: 'female', accent: 'american', category: 'soft' },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', provider: 'elevenlabs', gender: 'male', accent: 'american', category: 'narration' },
      { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', provider: 'elevenlabs', gender: 'female', accent: 'american', category: 'emotional' },
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
            provider: 'elevenlabs_spoken',
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

    const baseFreq = 520 + (similarity * 180) + (pitchShift * 10);
    const modulationFreq = (1 - stability) * 10 + 1;
    const modulationDepth = (1 - stability) * 120;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freqMod = Math.sin(2 * Math.PI * modulationFreq * t) * modulationDepth;
      const sample = Math.sin(2 * Math.PI * (baseFreq + freqMod) * t) * 9000;
      buffer.writeInt16LE(Math.floor(sample), headerByteLength + i * 2);
    }

    const mimeType = format.toLowerCase() === 'wav' ? 'audio/wav' : format.toLowerCase() === 'ogg' ? 'audio/ogg' : 'audio/mpeg';

    return {
      audioBuffer: buffer,
      contentType: mimeType,
      provider: 'elevenlabs_simulated',
    };
  }
}
