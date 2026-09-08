import { TTSProviderFactory } from '../providers/providerFactory.js';
import { StorageService } from './storageService.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { PROVIDERS } from '../config/constants.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/apiError.js';

const inMemoryPreviewCache = new Map();

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

  /**
   * Check if voice preview exists in DB table tts_voice_previews.
   * If available, return saved audio URL. If not, generate once, save to table & storage, and return URL.
   */
  static async getOrGenerateVoicePreview({ voiceId, voiceName, provider = 'google', sampleText }) {
    if (!voiceId) {
      throw new ApiError(400, 'voiceId is required for preview');
    }

    const defaultSampleText = sampleText || `Hello! This is a preview of the ${voiceName || voiceId} voice.`;

    // 1. Check In-Memory Cache first
    if (inMemoryPreviewCache.has(voiceId)) {
      logger.info(`Preview cache hit (in-memory) for voice ${voiceId}`);
      return { audioUrl: inMemoryPreviewCache.get(voiceId), cached: true };
    }

    // 2. Check Supabase DB table `tts_voice_previews`
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('tts_voice_previews')
        .select('*')
        .eq('voice_id', voiceId)
        .maybeSingle();

      if (!error && data && data.audio_url) {
        logger.info(`Preview DB cache hit for voice ${voiceId}`);
        inMemoryPreviewCache.set(voiceId, data.audio_url);
        return { audioUrl: data.audio_url, cached: true };
      }
    } catch (err) {
      logger.warn(`Database lookup failed for voice preview ${voiceId}: ${err.message}`);
    }

    // 3. Generate preview audio using provider (with fallback if provider fails)
    logger.info(`Generating new preview audio for voice ${voiceId} (${provider})`);
    let audioBuffer, contentType, usedProvider;
    try {
      const driver = TTSProviderFactory.getProvider(provider);
      const res = await driver.generateSpeech({
        text: defaultSampleText,
        voiceId,
        format: 'mp3',
      });
      audioBuffer = res.audioBuffer;
      contentType = res.contentType;
      usedProvider = res.provider;
    } catch (err) {
      logger.warn(`Primary provider (${provider}) failed for preview ${voiceId}, using fallback: ${err.message}`);
      const fallbackDriver = TTSProviderFactory.getProvider('google');
      const res = await fallbackDriver.generateSpeech({
        text: defaultSampleText,
        voiceId,
        format: 'mp3',
      });
      audioBuffer = res.audioBuffer;
      contentType = res.contentType;
      usedProvider = 'google_fallback';
    }

    const filename = `preview_${voiceId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.mp3`;
    const { filePath, publicUrl } = await StorageService.uploadAudio({
      buffer: audioBuffer,
      filename,
      contentType,
    });

    // 4. Save to `tts_voice_previews` DB table (using upsert with onConflict for voice_id)
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('tts_voice_previews')
        .upsert(
          {
            voice_id: voiceId,
            voice_name: voiceName || voiceId,
            provider: usedProvider || provider,
            sample_text: defaultSampleText,
            audio_url: publicUrl,
            file_path: filePath,
            format: 'mp3',
            duration_seconds: 3,
          },
          { onConflict: 'voice_id' }
        );

      if (error) {
        logger.error(`Database upsert error for tts_voice_previews (${voiceId}): ${error.message}`);
      } else {
        logger.info(`Successfully stored preview in tts_voice_previews for voice ${voiceId}`);
      }
    } catch (err) {
      logger.warn(`Failed to store preview record in database for ${voiceId}: ${err.message}`);
    }

    // Update in-memory cache
    inMemoryPreviewCache.set(voiceId, publicUrl);

    return { audioUrl: publicUrl, cached: false };
  }
}


