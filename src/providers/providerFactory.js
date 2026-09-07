import { ElevenLabsProvider } from './elevenlabs.js';
import { OpenAiTtsProvider } from './openAiTts.js';
import { GoogleTtsProvider } from './googleTts.js';
import { PROVIDERS } from '../config/constants.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export class TTSProviderFactory {
  static getProvider(providerName = env.DEFAULT_TTS_PROVIDER) {
    const key = providerName.toLowerCase();
    switch (key) {
      case PROVIDERS.ELEVENLABS:
        return new ElevenLabsProvider();
      case PROVIDERS.OPENAI:
        return new OpenAiTtsProvider();
      case PROVIDERS.GOOGLE:
        return new GoogleTtsProvider();
      default:
        // Default to ElevenLabs driver
        return new ElevenLabsProvider();
    }
  }
}
