import { serve } from '@hono/node-server';
import cron from 'node-cron';

import { createHttpServer } from './application/http/index.js';

import { getArticleRepository } from './di/container.js';
import { generateArticles } from './services/gemini.js';

import './config/env.js';

const articleRepository = getArticleRepository();

const shouldGenerateArticles = async () => {
    const lastGen = await articleRepository.findLatest();
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
        await articleRepository.createMany(allArticles);

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

// Start server with proper error handling
const startServer = async () => {
    console.log('Starting server');
    try {
        await init();
        
        const app = createHttpServer();
        serve(app, (info) => {
            console.log(`Server is running on port ${info.port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
