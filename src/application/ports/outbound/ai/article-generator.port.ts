import { type Article } from '../../../../domain/entities/article.entity.js';
import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

export interface ArticleGenerationParams {
    articles: {
        news: Array<{ content: string; title: string }>;
        publicationHistory: Array<{ headline: string; summary: string }>;
    };
    count: number;
    country: Country;
    language: Language;
}

/**
 * Port for generating articles using AI
 */
export interface ArticleGeneratorPort {
    generateArticles(params: ArticleGenerationParams): Promise<Article[]>;
}

/**
 * News article for generation
 */
export interface NewsForGeneration {
    publishedAt: Date;
    publishedCount: number;
    text: string;
    title: string;
}
