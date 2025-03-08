import { type Country,type Language } from '@prisma/client';

import { type Article } from '../../../../domain/entities/article.js';

type NewsArticle = {
    title: string;
    summary: string | null;
};

export type GenerateArticlesParams = {
    sourceArticles: NewsArticle[];
    recentArticles: Article[];
    language: Language;
    sourceCountry: Country;
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