import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
    GEMINI_API_KEY: z.string().min(1),
    WORLD_NEWS_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env); 