import { type Article } from '../../../../domain/entities/article.entity.js';
import { type ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { type ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

/**
 * Port for generating articles using AI
 */
export interface ArticleGeneratorPort {
    /**
     * Generate a mix of real and fake articles based on source articles
     * @param params Parameters for article generation
     * @returns Generated articles with metadata
     */
    generateArticles(params: GenerateArticlesParams): Promise<Article[]>;
}

/**
 * Parameters for generating articles
 */
export type GenerateArticlesParams = {
    articles: {
        news: Array<{ content: string; title: string }>;
        publicationHistory: Array<{ headline: string; summary: string }>;
    };
    count: number;
    country: ArticleCountry;
    language: ArticleLanguage;
};
