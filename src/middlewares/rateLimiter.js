import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

export const ttsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 TTS generations per minute per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      message: 'TTS generation rate limit exceeded. Please wait a moment before generating more speech.',
    });
  },
});
