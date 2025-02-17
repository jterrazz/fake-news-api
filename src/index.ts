import { serve } from '@hono/node-server';
import type { Article } from '@prisma/client';
import { Hono } from 'hono';
import cron from 'node-cron';
import { z } from 'zod';

import { prisma } from './db/client.js';
import { generateArticles } from './services/gemini.js';

import './config/env.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const app = new Hono();

const shouldGenerateArticles = async () => {
    // Get the latest article
    const lastGen = await prisma.article.findFirst({
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!lastGen) return true;

    const lastDate = new Date(lastGen.createdAt);
    const today = new Date();

    // Set both dates to midnight for comparison
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // If last generation was before today, we should generate
    return lastDate < today;
};

const generateDailyArticles = async () => {
    try {
        // Check if we already generated articles today
        if (!(await shouldGenerateArticles())) {
            console.log('Articles already generated today, skipping');
            return;
        }
        console.log('Generating articles');

        // Generate articles for both languages
        const [enArticles, frArticles] = await Promise.all([
            generateArticles('en'),
            generateArticles('fr'),
        ]);

        // Save all articles
        const allArticles = [...enArticles, ...frArticles];
        await prisma.article.createMany({
            data: allArticles,
        });

        console.log(
            `Generated and saved ${allArticles.length} articles:
            - EN: ${enArticles.length} (${enArticles.filter((a) => !a.isFake).length} real, ${
                enArticles.filter((a) => a.isFake).length
            } fake)
            - FR: ${frArticles.length} (${frArticles.filter((a) => !a.isFake).length} real, ${
                frArticles.filter((a) => a.isFake).length
            } fake)`,
        );
    } catch (error) {
        console.error('Failed to generate daily articles:', error);
    }
};

// Initialize and start cron job
const init = async () => {
    try {
        console.log('Initializing');

        // Check and generate articles immediately if needed
        await generateDailyArticles();

        // Schedule next generation for 11 AM
        cron.schedule('0 11 * * *', generateDailyArticles);
        console.log('Cron job scheduled for 11 AM daily');
    } catch (error) {
        console.error('Failed to initialize:', error);
        process.exit(1);
    }
};

const paginationSchema = z.object({
    category: z
        .enum([
            'WORLD',
            'POLITICS',
            'BUSINESS',
            'TECHNOLOGY',
            'SCIENCE',
            'HEALTH',
            'SPORTS',
            'ENTERTAINMENT',
            'LIFESTYLE',
            'OTHER',
        ])
        .optional(),
    country: z.enum(['us', 'fr']).optional(),
    cursor: z.string().optional(),
    language: z.enum(['en', 'fr']).default('en'),
    limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

type PaginatedResponse<T> = {
    items: T[];
    nextCursor: string | null;
    total: number;
};

app.get('/', (c) => c.text('OK'));

app.get('/articles', async (c) => {
    try {
        const query = c.req.query();
        const validatedParams = paginationSchema.safeParse({
            category: query.category,
            country: query.country,
            cursor: query.cursor,
            language: query.language,
            limit: query.limit ? Number(query.limit) : DEFAULT_PAGE_SIZE,
        });

        if (!validatedParams.success)
            return c.json({ error: 'Invalid pagination parameters' }, 400);

        const { cursor, limit, category, language, country } = validatedParams.data;

        // Decode cursor if provided
        let cursorDate: Date | undefined;
        if (cursor) {
            try {
                const timestamp = Number(atob(cursor));
                if (isNaN(timestamp)) throw new Error('Invalid cursor timestamp');
                cursorDate = new Date(timestamp);
            } catch {
                return c.json({ error: 'Invalid cursor' }, 400);
            }
        }

        // Build where conditions
        const where = {
            AND: [
                { language },
                ...(cursorDate ? [{ createdAt: { lt: cursorDate } }] : []),
                ...(category ? [{ category }] : []),
                ...(country ? [{ country }] : []),
            ],
        };

        // Get total count
        const total = await prisma.article.count({ where });

        // Fetch items
        const items = await prisma.article.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            take: limit + 1,
            where,
        });

        // Check if there are more items
        const hasMore = items.length > limit;
        const results = items.slice(0, limit);

        // Generate next cursor
        const nextCursor = hasMore
            ? Buffer.from(results[results.length - 1].createdAt.getTime().toString()).toString(
                  'base64',
              )
            : null;

        const response: PaginatedResponse<Article> = {
            items: results,
            nextCursor,
            total,
        };

        return c.json(response);
    } catch (error) {
        console.error('Failed to fetch articles:', error);
        return c.json({ error: 'Failed to fetch articles' }, 500);
    }
});

// Start server with proper error handling
const startServer = async () => {
    console.log('Starting server');
    try {
        await init();
        serve(app, (info) => {
            console.log(`Server is running on port ${info.port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
