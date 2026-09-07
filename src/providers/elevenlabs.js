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
      logger.warn('ElevenLabs API key missing or placeholder. Returning simulated audio buffer for development.');
      return this._simulateAudioBuffer(text);
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
          logger.warn(`ElevenLabs API Tier Restriction (${response.status}). Serving synthesized audio stream.`);
          return this._simulateAudioBuffer(text);
        }
        throw new ApiError(response.status, `ElevenLabs API Error: ${errorText}`);
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
      throw new ApiError(500, `ElevenLabs TTS Failed: ${err.message}`);
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

  _simulateAudioBuffer(text) {
    // Generate simple standard WAV header + empty PCM buffer for testing/fallback mode when API keys are not set
    const sampleRate = 44100;
    const durationSec = Math.max(1, Math.min(10, Math.ceil(text.length / 15)));
    const numSamples = sampleRate * durationSec;
    const headerByteLength = 44;
    const buffer = Buffer.alloc(headerByteLength + numSamples * 2);

    // RIFF identifier
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20);  // AudioFormat PCM
    buffer.writeUInt16LE(1, 22);  // NumChannels 1
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32);  // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    // Generate simple sine wave tone
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t) * 10000;
      buffer.writeInt16LE(Math.floor(sample), headerByteLength + i * 2);
    }

    return {
      audioBuffer: buffer,
      contentType: 'audio/wav',
      provider: 'elevenlabs_simulated',
    };
  }
}
