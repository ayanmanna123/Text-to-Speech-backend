import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').default('Untitled Project'),
    description: z.string().optional(),
    scriptBlocks: z.array(
      z.object({
        id: z.string().optional(),
        text: z.string(),
        voiceId: z.string().optional(),
        provider: z.string().optional(),
      })
    ).optional(),
  }),
});
