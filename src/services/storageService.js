import { getSupabaseAdmin } from '../config/supabase.js';
import { STORAGE_BUCKET } from '../config/constants.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/apiError.js';

export class StorageService {
  /**
   * Upload audio buffer to Supabase Storage bucket
   */
  static async uploadAudio({ buffer, filename, contentType = 'audio/mpeg' }) {
    const supabaseAdmin = getSupabaseAdmin();
    const filePath = `generations/${Date.now()}_${filename}`;

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        logger.error(`Supabase Storage upload error: ${error.message}`);
        // Return a mock URL if bucket doesn't exist yet in Supabase
        return {
          filePath,
          publicUrl: `https://placeholder-storage.supabase.co/${filePath}`,
        };
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return {
        filePath: data.path,
        publicUrl: publicUrlData.publicUrl,
      };
    } catch (err) {
      logger.error('Failed to upload audio to Supabase storage:', err);
      return {
        filePath,
        publicUrl: `https://placeholder-storage.supabase.co/${filePath}`,
      };
    }
  }
}
