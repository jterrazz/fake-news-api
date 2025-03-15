import { z } from 'zod';

import { ArticleCategory } from '../value-objects/article-category.vo.js';
import { ArticleContent } from '../value-objects/article-content.vo.js';
import { ArticleCountry } from '../value-objects/article-country.vo.js';
import { ArticleFakeStatus } from '../value-objects/article-fake-status.vo.js';
import { ArticleHeadline } from '../value-objects/article-headline.vo.js';
import { ArticleLanguage } from '../value-objects/article-language.vo.js';
import { ArticleSummary } from '../value-objects/article-summary.vo.js';

export const articleSchema = z.object({
    category: z.custom<ArticleCategory>(
        (val) => val instanceof ArticleCategory,
        'Invalid category',
    ),
    content: z.custom<ArticleContent>((val) => val instanceof ArticleContent, 'Invalid content'),
    country: z.custom<ArticleCountry>((val) => val instanceof ArticleCountry, 'Invalid country'),
    createdAt: z.date().default(() => new Date()),
    fakeStatus: z.custom<ArticleFakeStatus>(
        (val) => val instanceof ArticleFakeStatus,
        'Invalid fake status',
    ),
    headline: z.custom<ArticleHeadline>(
        (val) => val instanceof ArticleHeadline,
        'Invalid headline',
    ),
    id: z.string().uuid().optional(),
    language: z.custom<ArticleLanguage>(
        (val) => val instanceof ArticleLanguage,
        'Invalid language',
    ),
    summary: z.custom<ArticleSummary>((val) => val instanceof ArticleSummary, 'Invalid summary'),
});

export type ArticleProps = z.input<typeof articleSchema>;

export class Article {
    public readonly id: string;
    public readonly headline: ArticleHeadline;
    public readonly summary: ArticleSummary;
    public readonly content: ArticleContent;
    public readonly category: ArticleCategory;
    public readonly country: ArticleCountry;
    public readonly language: ArticleLanguage;
    public readonly fakeStatus: ArticleFakeStatus;
    public readonly createdAt: Date;

    private constructor(props: ArticleProps) {
        const validatedProps = articleSchema.parse(props);

        this.id = validatedProps.id ?? crypto.randomUUID();
        this.headline = validatedProps.headline;
        this.summary = validatedProps.summary;
        this.content = validatedProps.content;
        this.category = validatedProps.category;
        this.country = validatedProps.country;
        this.language = validatedProps.language;
        this.fakeStatus = validatedProps.fakeStatus;
        this.createdAt = validatedProps.createdAt;
    }

    public static create(props: ArticleProps): Article {
        return new Article({
            ...props,
            fakeStatus: props.fakeStatus ?? ArticleFakeStatus.createNonFake(),
        });
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
            summary: this.summary,
        };
    }

    public isFake(): boolean {
        return this.fakeStatus.isFake;
    }
}
