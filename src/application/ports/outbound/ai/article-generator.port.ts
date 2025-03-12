import { type Article } from '../../../../domain/entities/article.js';
import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

import { NewsArticle } from '../data-sources/news.port.js';

/**
 * Parameters for generating articles
 */
export type GenerateArticlesParams = {
    articles: {
        publicationHistory: string[];
        news: NewsArticle[];
    };
    language: ArticleLanguage;
    country: ArticleCountry;
};

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
