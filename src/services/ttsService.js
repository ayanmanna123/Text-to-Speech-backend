import { TTSProviderFactory } from '../providers/providerFactory.js';
import { StorageService } from './storageService.js';
import { UsageService } from './usageService.js';
import { calculateEstimatedDuration } from '../utils/audioUtils.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export class TTSService {
  /**
   * Synthesize text to speech, upload audio, record generation in database, and deduct user credits
   */
  static async generateSpeech({ userId, text, voiceId, voiceName, provider, format = 'mp3', settings = {} }) {
    const characterCount = text.length;

    // 1. Verify User Quota
    await UsageService.verifyQuota(userId, characterCount);

    // 2. Obtain Driver and Synthesize Speech
    const driver = TTSProviderFactory.getProvider(provider);
    const { audioBuffer, contentType, provider: usedProvider } = await driver.generateSpeech({
      text,
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

    const durationSeconds = calculateEstimatedDuration(text);

    // 4. Save Record in Supabase DB
    let generationRecord = null;
    if (userId) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('tts_generations')
          .insert({
            user_id: userId,
            text_content: text,
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

    // 5. Deduct User Quota
    await UsageService.deductQuota(userId, characterCount, generationRecord?.id, usedProvider);

    return {
      generationId: generationRecord?.id || null,
      audioUrl: publicUrl,
      audioBuffer,
      contentType,
      durationSeconds,
      characterCount,
      provider: usedProvider,
    };
  }

  /**
   * Fetch generation history for a specific user
   */
  static async getUserHistory(userId, limit = 20, page = 1) {
    if (!userId) return { history: [], total: 0 };

    const supabase = getSupabaseAdmin();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('tts_generations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error(`Error fetching history for user ${userId}:`, error);
      return { history: [], total: 0 };
    }

    return {
      history: data || [],
      total: count || 0,
      page,
      limit,
    };
  }
}
