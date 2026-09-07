import { z } from 'zod';

export const generateTtsSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text cannot be empty').max(5000, 'Text cannot exceed 5000 characters per request'),
    voiceId: z.string().min(1, 'Voice ID is required'),
    voiceName: z.string().optional(),
    provider: z.enum(['elevenlabs', 'openai', 'google']).default('elevenlabs'),
    format: z.enum(['mp3', 'wav', 'ogg']).default('mp3'),
    settings: z.object({
      stability: z.number().min(0).max(1).optional(),
      similarity_boost: z.number().min(0).max(1).optional(),
      speed: z.number().min(0.25).max(4.0).optional(),
      pitch: z.number().min(-20).max(20).optional(),
      languageCode: z.string().optional(),
    }).optional(),
  }),
});
