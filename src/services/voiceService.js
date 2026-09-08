import { TTSProviderFactory } from '../providers/providerFactory.js';
import { PROVIDERS } from '../config/constants.js';
import { logger } from '../config/logger.js';

export class VoiceService {
  /**
   * Aggregate available voices from all supported providers
   */
  static async getAllVoices(filters = {}) {
    const { provider, gender, search, category, language } = filters;
    let allVoices = [];

    const targetProviders = provider ? [provider.toLowerCase()] : [PROVIDERS.ELEVENLABS, PROVIDERS.OPENAI, PROVIDERS.GOOGLE];

    for (const p of targetProviders) {
      try {
        const driver = TTSProviderFactory.getProvider(p);
        const voices = await driver.getVoices();
        allVoices.push(...voices);
      } catch (err) {
        logger.error(`Error loading voices for provider ${p}:`, err);
      }
    }

    // Apply Filters
    if (gender) {
      allVoices = allVoices.filter((v) => v.gender?.toLowerCase() === gender.toLowerCase());
    }

    if (category) {
      allVoices = allVoices.filter((v) => v.category?.toLowerCase() === category.toLowerCase());
    }

    if (language) {
      const langLower = language.toLowerCase();
      allVoices = allVoices.filter((v) => 
        (v.language && v.language.toLowerCase().includes(langLower)) ||
        (v.languageCode && v.languageCode.toLowerCase().includes(langLower))
      );
    }

    if (search) {
      const q = search.toLowerCase();
      allVoices = allVoices.filter((v) => v.name.toLowerCase().includes(q) || v.provider.toLowerCase().includes(q) || (v.language && v.language.toLowerCase().includes(q)));
    }

    return allVoices;
  }
}
