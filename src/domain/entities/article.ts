import { ArticleCategory } from '../value-objects/article-category.vo.js';
import { ArticleCountry } from '../value-objects/article-country.vo.js';
import { ArticleLanguage } from '../value-objects/article-language.vo.js';

export class Article {
    private constructor(
        public readonly id: string,
        public readonly headline: string,
        public readonly summary: string,
        public readonly article: string,
        public readonly category: ArticleCategory,
        public readonly country: ArticleCountry,
        public readonly language: ArticleLanguage,
        public readonly isFake: boolean,
        public readonly fakeReason: string | null,
        public readonly createdAt: Date,
    ) {}

    static create(params: {
        headline: string;
        summary: string;
        article: string;
        category: ArticleCategory;
        country: ArticleCountry;
        language: ArticleLanguage;
        isFake?: boolean;
        fakeReason?: string | null;
    }): Article {
        return new Article(
            crypto.randomUUID(),
            params.headline,
            params.summary,
            params.article,
            params.category,
            params.country,
            params.language,
            params.isFake ?? false,
            params.fakeReason ?? null,
            new Date(),
        );
    }

    markAsFake(reason: string): Article {
        return new Article(
            this.id,
            this.headline,
            this.summary,
            this.article,
            this.category,
            this.country,
            this.language,
            true,
            reason,
            this.createdAt,
        );
    }
}
