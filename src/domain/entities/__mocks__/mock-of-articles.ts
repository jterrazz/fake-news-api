import { Authenticity } from '../../value-objects/article/authenticity.vo.js';
import { Body } from '../../value-objects/article/body.vo.js';
import { Headline } from '../../value-objects/article/headline.vo.js';
import { Summary } from '../../value-objects/article/summary.vo.js';
import { Category } from '../../value-objects/category.vo.js';
import { type Country } from '../../value-objects/country.vo.js';
import { type Language } from '../../value-objects/language.vo.js';
import { Article } from '../article.entity.js';

/**
 * Creates an array of mock articles for testing purposes
 */
export function mockArticles(count: number, country: Country, language: Language): Article[] {
    return Array.from({ length: count }, (_, index) => createMockArticle(index, country, language));
}

/**
 * Creates a single mock article with the given parameters
 */
function createMockArticle(index: number, country: Country, language: Language): Article {
    return new Article({
        authenticity: createMockAuthenticity(),
        body: generateMockArticleBody(index),
        category: getMockArticleCategory(index),
        country,
        headline: createMockHeadline(index),
        id: crypto.randomUUID(),
        language,
        publishedAt: new Date(),
        summary: createMockSummary(index),
    });
}

/**
 * Creates an authenticity status for mock articles
 */
function createMockAuthenticity(): Authenticity {
    return new Authenticity(true, 'AI-generated content for testing purposes');
}

/**
 * Creates a mock headline for an article
 */
function createMockHeadline(index: number): Headline {
    return new Headline(`Generated Mock Article ${index + 1}`);
}

/**
 * Creates a mock summary for an article
 */
function createMockSummary(index: number): Summary {
    const summaryText =
        `Summary of generated article ${index + 1} providing key insights and main points. `.repeat(
            5,
        );
    return new Summary(summaryText.trim());
}

/**
 * Generates detailed body for a mock article
 */
function generateMockArticleBody(index: number): Body {
    const categoryName = index % 2 === 0 ? 'political' : 'technological';
    const body = `This is article ${index + 1} with detailed body about ${categoryName} developments. The body discusses various aspects and their potential impacts on society. Multiple perspectives are presented to provide a balanced view of the current situation and its implications for the future.`;

    return new Body(body);
}

/**
 * Determines the category for an article based on its index
 */
function getMockArticleCategory(index: number): Category {
    const categories = ['politics', 'technology', 'business', 'science'] as const;
    const categoryName = categories[index % categories.length];
    return new Category(categoryName);
}
