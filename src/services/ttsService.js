import { TTSProviderFactory } from '../providers/providerFactory.js';
import { StorageService } from './storageService.js';
import { UsageService } from './usageService.js';
import { calculateEstimatedDuration } from '../utils/audioUtils.js';
import { validateSpeakableText } from '../utils/textUtils.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

// In-memory fallback history for guest/unauthenticated sessions
const guestHistoryCache = [];

export class TTSService {
  /**
   * Synthesize text to speech, upload audio, record generation in database, and deduct user credits
   */
  static async generateSpeech({ userId, text, voiceId, voiceName, provider, format = 'mp3', settings = {} }) {
    const sanitizedText = validateSpeakableText(text);
    const characterCount = sanitizedText.length;

    // 1. Verify User Quota
    await UsageService.verifyQuota(userId, characterCount);

    // 2. Obtain Driver and Synthesize Speech
    const driver = TTSProviderFactory.getProvider(provider);
    const { audioBuffer, contentType, provider: usedProvider } = await driver.generateSpeech({
      text: sanitizedText,
      voiceId,
      format,
      settings,
    });

    // 3. Upload Audio to Storage
    const filename = `${voiceId}_${Date.now()}.${format}`;
    const { filePath, publicUrl } = await StorageService.uploadAudio({
      buffer: audioBuffer,
      filename,
      contentType,
    });

    const durationSeconds = calculateEstimatedDuration(sanitizedText);
    const createdAt = new Date().toISOString();

    // 4. Save Record in Supabase DB or Guest Cache
    let generationRecord = null;

    if (userId) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('tts_generations')
          .insert({
            user_id: userId,
            text_content: sanitizedText,
            character_count: characterCount,
            voice_id: voiceId,
            voice_name: voiceName || voiceId,
            provider: usedProvider,
            audio_url: publicUrl,
            file_path: filePath,
            format,
            duration_seconds: durationSeconds,
            settings,
          })
          .select()
          .single();

        if (!error) generationRecord = data;
      } catch (err) {
        logger.error('Failed to log generation record to DB:', err);
      }
    }

    // Fallback/Guest record
    const historyItem = generationRecord || {
      id: `gen_${Date.now()}`,
      user_id: userId || 'guest',
      text_content: sanitizedText,
      character_count: characterCount,
      voice_id: voiceId,
      voice_name: voiceName || voiceId,
      provider: usedProvider,
      audio_url: publicUrl,
      file_path: filePath,
      format,
      duration_seconds: durationSeconds,
      created_at: createdAt,
    };

    if (!userId) {
      guestHistoryCache.unshift(historyItem);
      if (guestHistoryCache.length > 50) guestHistoryCache.pop(); // Keep last 50
    }

    // 5. Deduct User Quota
    await UsageService.deductQuota(userId, characterCount, historyItem.id, usedProvider);

    return {
      generationId: historyItem.id,
      audioUrl: publicUrl,
      audioBuffer,
      contentType,
      durationSeconds,
      characterCount,
      provider: usedProvider,
      createdAt,
    };
  }

  /**
   * Fetch generation history for a user or guest cache
   */
  static async getUserHistory(userId, limit = 20, page = 1) {
    if (!userId) {
      return {
        history: guestHistoryCache.slice((page - 1) * limit, page * limit),
        total: guestHistoryCache.length,
        page,
        limit,
      };
    }

    const supabase = getSupabaseAdmin();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      const { data, error, count } = await supabase
        .from('tts_generations')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error || !data) {
        return { history: guestHistoryCache, total: guestHistoryCache.length, page, limit };
      }

      return {
        history: data,
        total: count || data.length,
        page,
        limit,
      };
    } catch (err) {
      return { history: guestHistoryCache, total: guestHistoryCache.length, page, limit };
    }
  }
}
