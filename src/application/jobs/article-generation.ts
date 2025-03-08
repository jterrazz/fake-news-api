import { getArticleRepository } from '../../di/container.js';
import { generateArticles } from '../../services/gemini.js';

const shouldGenerateArticles = async (articleRepository: ReturnType<typeof getArticleRepository>) => {
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

export const generateDailyArticles = async () => {
    const articleRepository = getArticleRepository();

    try {
        // Check if we already generated articles today
        if (!(await shouldGenerateArticles(articleRepository))) {
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