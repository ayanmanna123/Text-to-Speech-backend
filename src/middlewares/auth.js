import { getSupabaseClient } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../config/logger.js';

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development mode without credentials set, allow demo user header or return unauthorized
      if (process.env.NODE_ENV === 'development' && req.headers['x-demo-user-id']) {
        req.user = { id: req.headers['x-demo-user-id'], email: 'demo@tts.local', role: 'user' };
        return next();
      }
      throw ApiError.unauthorized('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.error(`Authentication error: ${error?.message || 'Invalid token'}`);
      throw ApiError.unauthorized('Invalid or expired authentication token');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.user = user;
      }
    } else if (process.env.NODE_ENV === 'development' && req.headers['x-demo-user-id']) {
      req.user = { id: req.headers['x-demo-user-id'], email: 'demo@tts.local', role: 'user' };
    }
    next();
  } catch (err) {
    next();
  }
};
