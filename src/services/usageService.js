import { getSupabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../config/logger.js';
import { DEFAULT_USER_QUOTA } from '../config/constants.js';

export class UsageService {
  /**
   * Check if user has sufficient character quota remaining
   */
  static async verifyQuota(userId, characterCount) {
    if (!userId) return true; // Unauthenticated/demo mode bypass

    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
      .from('tts_profiles')
      .select('character_quota, characters_used')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logger.warn(`User profile not found for ID: ${userId}. Using default quota.`);
      return true;
    }

    const remaining = profile.character_quota - profile.characters_used;
    if (remaining < characterCount) {
      throw ApiError.quotaExceeded(
        `Insufficient character credits. Required: ${characterCount}, Available: ${remaining}`
      );
    }

    return true;
  }

  /**
   * Deduct character count from user profile
   */
  static async deductQuota(userId, characterCount, generationId, provider) {
    if (!userId) return;

    const supabase = getSupabaseAdmin();

    try {
      const { data: profile } = await supabase
        .from('tts_profiles')
        .select('characters_used')
        .eq('id', userId)
        .single();

      const currentUsed = profile?.characters_used || 0;

      await supabase
        .from('tts_profiles')
        .update({ characters_used: currentUsed + characterCount, updated_at: new Date() })
        .eq('id', userId);

      await supabase.from('tts_usage_logs').insert({
        user_id: userId,
        generation_id: generationId || null,
        characters_deducted: characterCount,
        provider,
      });
    } catch (err) {
      logger.error(`Error deducting user quota for ${userId}:`, err);
    }
  }

  /**
   * Fetch balance and usage info for a user
   */
  static async getUserUsage(userId) {
    if (!userId) {
      return {
        tier: 'free',
        characterQuota: DEFAULT_USER_QUOTA.FREE_CHARACTERS,
        charactersUsed: 0,
        charactersRemaining: DEFAULT_USER_QUOTA.FREE_CHARACTERS,
      };
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
      .from('tts_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return {
        tier: 'free',
        characterQuota: DEFAULT_USER_QUOTA.FREE_CHARACTERS,
        charactersUsed: 0,
        charactersRemaining: DEFAULT_USER_QUOTA.FREE_CHARACTERS,
      };
    }

    return {
      tier: profile.tier || 'free',
      characterQuota: profile.character_quota || DEFAULT_USER_QUOTA.FREE_CHARACTERS,
      charactersUsed: profile.characters_used || 0,
      charactersRemaining: Math.max(0, (profile.character_quota || DEFAULT_USER_QUOTA.FREE_CHARACTERS) - (profile.characters_used || 0)),
    };
  }
}
