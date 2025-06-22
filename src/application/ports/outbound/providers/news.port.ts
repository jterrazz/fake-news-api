import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

/**
 * Individual article within a story
 */
export interface NewsArticle {
    body: string;
    headline: string;
    id: string;
    publishedAt: Date;
}

/**
 * Options for fetching news stories
 */
export interface NewsOptions {
    country?: Country;
    language?: Language;
}

/**
 * News provider port - defines how to fetch news stories from external providers
 */
export interface NewsProviderPort {
    /**
     * Fetch news stories (each containing multiple articles) based on language and country
     */
    fetchNews(options?: NewsOptions): Promise<NewsStory[]>;
}

/**
 * News story containing multiple articles/perspectives
 */
export interface NewsStory {
    articles: NewsArticle[];
    publishedAt: Date;
}
