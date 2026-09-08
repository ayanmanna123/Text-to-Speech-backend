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
