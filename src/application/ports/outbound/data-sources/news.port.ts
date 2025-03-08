import { type Country, type Language } from '@prisma/client';

export interface NewsArticle {
    publishDate: string;
    summary: string | null;
    title: string;
    url: string;
}

export interface FetchNewsOptions {
    language: Language;
    sourceCountry: Country;
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
