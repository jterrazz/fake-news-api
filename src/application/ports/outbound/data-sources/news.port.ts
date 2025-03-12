import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

/**
 * Represents a news article
 */
export interface NewsArticle {
    publishedAt: Date;
    summary: string;
    title: string;
    url: string;
}

/**
 * Options for fetching news articles
 */
export interface FetchNewsOptions {
    language: ArticleLanguage;
    country: ArticleCountry;
}

/**
 * News data source port - defines how to fetch news articles from external providers
 */
export interface NewsPort {
    /**
     * Fetch news articles based on language and country
     */
    fetchNews(options: FetchNewsOptions): Promise<NewsArticle[]>;
}
