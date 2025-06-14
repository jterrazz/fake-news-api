import { type Article } from '../../../../domain/entities/article.entity.js';
import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

export interface ArticleGenerationContext {
    country: Country;
    language: Language;
}

export interface ArticleGenerationOptions {
    existingArticleSummaries: string[];
    news: NewsForGeneration[];
}

export interface ArticleGenerationResult {
    articlesCount: number;
}

export interface ArticleGeneratorPort {
    generateArticles(
        context: ArticleGenerationContext,
        options: ArticleGenerationOptions,
    ): Promise<Article[]>;
}

/**
 * Port for generating articles using AI
 */
export interface NewsForGeneration {
    publishedAt: Date;
    publishedCount: number;
    text: string;
    title: string;
}
