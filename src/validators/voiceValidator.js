import { z } from 'zod';

export const getVoicesSchema = z.object({
  query: z.object({
    provider: z.string().optional(),
    gender: z.string().optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    language: z.string().optional(),
  }),
});

export const getVoicePreviewSchema = z.object({
  body: z.object({
    voiceId: z.string().min(1, 'voiceId is required'),
    voiceName: z.string().optional(),
    provider: z.string().optional(),
    sampleText: z.string().optional(),
  }),
});

