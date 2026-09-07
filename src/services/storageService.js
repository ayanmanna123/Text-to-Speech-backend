import { getSupabaseAdmin } from '../config/supabase.js';
import { STORAGE_BUCKET } from '../config/constants.js';
import { logger } from '../config/logger.js';

export class StorageService {
  /**
   * Upload audio buffer to Supabase Storage bucket with Base64 Data URI fallback
   */
  static async uploadAudio({ buffer, filename, contentType = 'audio/mpeg' }) {
    const supabaseAdmin = getSupabaseAdmin();
    const filePath = `generations/${Date.now()}_${filename}`;

    // Base64 Data URI fallback guaranteeing immediate browser playback even if Supabase Storage is unconfigured
    const base64Audio = buffer.toString('base64');
    const dataUriFallback = `data:${contentType};base64,${base64Audio}`;

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        logger.warn(`Supabase Storage upload warning: ${error.message}. Serving audio via Data URI stream.`);
        return {
          filePath,
          publicUrl: dataUriFallback,
        };
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return {
        filePath: data.path,
        publicUrl: publicUrlData.publicUrl || dataUriFallback,
      };
    } catch (err) {
      logger.warn('Serving audio via Data URI stream fallback:', err.message);
      return {
        filePath,
        publicUrl: dataUriFallback,
      };
    }
  }
}
