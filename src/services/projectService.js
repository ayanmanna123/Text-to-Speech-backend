import { getSupabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../config/logger.js';

export class ProjectService {
  static async createProject(userId, { title, description, scriptBlocks = [] }) {
    if (!userId) throw ApiError.unauthorized('Authentication required to save projects');

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tts_projects')
      .insert({
        user_id: userId,
        title: title || 'Untitled Project',
        description: description || '',
        script_blocks: scriptBlocks,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating project:', error);
      throw ApiError.internal('Failed to create project record');
    }

    return data;
  }

  static async getUserProjects(userId) {
    if (!userId) return [];

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tts_projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return [];
    return data || [];
  }
}
