import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export const getHealth = (req, res) => {
  return sendSuccess(res, {
    message: 'Text-to-Speech API is running smoothly.',
    data: {
      status: 'UP',
      environment: env.NODE_ENV,
      defaultProvider: env.DEFAULT_TTS_PROVIDER,
      timestamp: new Date().toISOString(),
    },
  });
};
