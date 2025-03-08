import cron from 'node-cron';

import { generateDailyArticles } from './article-generation.js';

export const initializeScheduler = async () => {
    try {
        console.log('Initializing job scheduler');

        // Run article generation immediately on startup
        await generateDailyArticles();

        // Schedule article generation for 11 AM daily
        cron.schedule('0 11 * * *', generateDailyArticles);
        console.log('Article generation job scheduled for 11 AM daily');
    } catch (error) {
        console.error('Failed to initialize job scheduler:', error);
        throw error; // Re-throw to let the caller handle it
    }
}; 