import { serve } from '@hono/node-server';
import { desc } from 'drizzle-orm';
import { Hono } from 'hono';
import cron from 'node-cron';

import { setupDatabase } from './db/index.js';
import { articles } from './db/schema.js';
import { generateArticles } from './services/gemini.js';

import './config/env.js';

const app = new Hono();
const db = setupDatabase();

const shouldGenerateArticles = async () => {
    // Get the latest article
    const lastGen = await db
        .select()
        .from(articles)
        .orderBy(desc(articles.createdAt))
        .limit(1)
        .get();

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

        const newArticles = await generateArticles();

        console.log('New articles:', newArticles);

        await Promise.all(newArticles.map((article) => db.insert(articles).values(article)));

        console.log('Generated and saved 5 new articles');
    } catch (error) {
        console.error('Failed to generate daily articles:', error);
    }
};

// Initialize database and start cron job
const init = async () => {
    try {
        console.log('Initializing');

        // Check and generate articles immediately if needed
        await generateDailyArticles();

        // Schedule next generation for midnight
        cron.schedule('0 0 * * *', generateDailyArticles);
        console.log('Cron job scheduled');
    } catch (error) {
        console.error('Failed to initialize:', error);
        process.exit(1);
    }
};

app.get('/', (c) => c.text('OK'));

app.get('/articles', async (c) => {
    try {
        const results = await db.select().from(articles).all();
        return c.json(results);
    } catch (error) {
        console.error('Failed to fetch articles:', error);
        return c.json({ error: 'Failed to fetch articles' }, 500);
    }
});

// Start server with proper error handling
const startServer = async () => {
    console.log('Starting server');
    try {
        console.log('Starting server');
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
