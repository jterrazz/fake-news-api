import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
    GEMINI_API_KEY: z.string(),
    WORLD_NEWS_API_KEY: z.string(),
});

export const env = envSchema.parse(process.env); 