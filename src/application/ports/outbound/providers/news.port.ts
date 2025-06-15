import { type Country } from '../../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

/**
 * News article from external providers
 */
export interface NewsArticle {
    body: string;
    coverage: number;
    headline: string;
    publishedAt: Date;
}

/**
 * Options for fetching news articles
 */
export interface NewsOptions {
    country?: Country;
    language?: Language;
}

/**
 * News provider port - defines how to fetch news articles from external providers
 */
export interface NewsProviderPort {
    /**
     * Fetch news articles based on language and country
     */
    fetchNews(options?: NewsOptions): Promise<NewsArticle[]>;
}
