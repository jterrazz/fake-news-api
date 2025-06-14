import { Authenticity } from '../../value-objects/article/authenticity.vo.js';
import { Content } from '../../value-objects/article/content.vo.js';
import { Headline } from '../../value-objects/article/headline.vo.js';
import { Summary } from '../../value-objects/article/summary.vo.js';
import { Category } from '../../value-objects/category.vo.js';
import { type Country } from '../../value-objects/country.vo.js';
import { type Language } from '../../value-objects/language.vo.js';
import { Article } from '../article.entity.js';

/**
 * Builds an array of test articles for testing purposes
 */
export function buildTestArticles(count: number, country: Country, language: Language): Article[] {
    return Array.from({ length: count }, (_, index) => createTestArticle(index, country, language));
}

/**
 * Creates a single test article with the given parameters
 */
function createTestArticle(index: number, country: Country, language: Language): Article {
    return new Article({
        authenticity: createTestAuthenticity(),
        category: getTestArticleCategory(index),
        content: generateTestArticleContent(index),
        country,
        createdAt: new Date(),
        headline: createTestHeadline(index),
        id: crypto.randomUUID(),
        language,
        publishedAt: new Date(),
        summary: createTestSummary(index),
    });
}

/**
 * Creates an authenticity status for test articles
 */
function createTestAuthenticity(): Authenticity {
    return new Authenticity(true, 'AI-generated content for testing purposes');
}

/**
 * Creates a test headline for an article
 */
function createTestHeadline(index: number): Headline {
    return new Headline(`Generated Test Article ${index + 1}`);
}

/**
 * Creates a test summary for an article
 */
function createTestSummary(index: number): Summary {
    const summaryText =
        `Summary of generated article ${index + 1} providing key insights and main points. `.repeat(
            5,
        );
    return new Summary(summaryText.trim());
}

/**
 * Generates detailed content for a test article
 */
function generateTestArticleContent(index: number): Content {
    const categoryName = index % 2 === 0 ? 'political' : 'technological';
    const content = `This is article ${index + 1} with detailed content about ${categoryName} developments. The content discusses various aspects and their potential impacts on society. Multiple perspectives are presented to provide a balanced view of the current situation and its implications for the future.`;

    return new Content(content);
}

/**
 * Determines the category for an article based on its index
 */
function getTestArticleCategory(index: number): Category {
    const categories = ['politics', 'technology', 'business', 'science'] as const;
    const categoryName = categories[index % categories.length];
    return new Category(categoryName);
}
