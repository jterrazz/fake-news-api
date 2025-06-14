import { z } from 'zod/v4';

import { ArticleContent } from '../value-objects/article/content.vo.js';
import { ArticleFakeStatus } from '../value-objects/article/fake-status.vo.js';
import { ArticleHeadline } from '../value-objects/article/headline.vo.js';
import { ArticleSummary } from '../value-objects/article/summary.vo.js';
import { Category } from '../value-objects/category.vo.js';
import { Country } from '../value-objects/country.vo.js';
import { Language } from '../value-objects/language.vo.js';

/**
 * Represents a news article entity.
 * @description Core article entity containing all article data and metadata.
 * @example
 * const article = Article.create({
 *   category: Category.create('technology'),
 *   country: z.custom<Country>((val) => val instanceof Country, 'Invalid country'),
 *   createdAt: z.date().default(() => new Date()),
 *   fakeStatus: z.custom<ArticleFakeStatus>(
 *     (val) => val instanceof ArticleFakeStatus,
 *     'Invalid fake status',
 *   ),
 *   headline: z.custom<ArticleHeadline>(
 *     (val) => val instanceof ArticleHeadline,
 *     'Invalid headline',
 *   ),
 *   id: z.string().uuid(),
 *   language: z.custom<Language>(
 *     (val) => val instanceof Language,
 *     'Invalid language',
 *   ),
 *   publishedAt: z.date(),
 *   summary: z.custom<ArticleSummary>(
 *     (val) => val instanceof ArticleSummary,
 *     'Invalid summary',
 *   ),
 * });
 */
export const articleSchema = z.object({
    category: z.custom<Category>(
        (val) => val instanceof Category,
        'Invalid category',
    ),
    content: z.custom<ArticleContent>((val) => val instanceof ArticleContent, 'Invalid content'),
    country: z.custom<Country>((val) => val instanceof Country, 'Invalid country'),
    createdAt: z.date().default(() => new Date()),
    fakeStatus: z.custom<ArticleFakeStatus>(
        (val) => val instanceof ArticleFakeStatus,
        'Invalid fake status',
    ),
    headline: z.custom<ArticleHeadline>(
        (val) => val instanceof ArticleHeadline,
        'Invalid headline',
    ),
    id: z.string().uuid(),
    language: z.custom<Language>(
        (val) => val instanceof Language,
        'Invalid language',
    ),
    publishedAt: z.date(),
    summary: z.custom<ArticleSummary>(
        (val) => val instanceof ArticleSummary,
        'Invalid summary',
    ),
});

export type ArticleProps = z.input<typeof articleSchema>;

export class Article {
    public readonly category: Category;
    public readonly content: ArticleContent;
    public readonly country: Country;
    public readonly createdAt: Date;
    public readonly fakeStatus: ArticleFakeStatus;
    public readonly headline: ArticleHeadline;
    public readonly id: string;
    public readonly language: Language;
    public readonly publishedAt: Date;
    public readonly summary: ArticleSummary;

    private constructor(data: z.infer<typeof articleSchema>) {
        this.category = data.category;
        this.content = data.content;
        this.country = data.country;
        this.createdAt = data.createdAt;
        this.fakeStatus = data.fakeStatus;
        this.headline = data.headline;
        this.id = data.id;
        this.language = data.language;
        this.publishedAt = data.publishedAt;
        this.summary = data.summary;
    }

    public static create(data: z.infer<typeof articleSchema>): Article {
        const result = articleSchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid article data: ${result.error.message}`);
        }

        return new Article(result.data);
    }

    public isFake(): boolean {
        return this.fakeStatus.isFake;
    }

    public toObject(): ArticleProps {
        return {
            category: this.category,
            content: this.content,
            country: this.country,
            createdAt: this.createdAt,
            fakeStatus: this.fakeStatus,
            headline: this.headline,
            id: this.id,
            language: this.language,
            publishedAt: this.publishedAt,
            summary: this.summary,
        };
    }
}
