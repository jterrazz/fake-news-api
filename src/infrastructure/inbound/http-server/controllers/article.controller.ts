import { Context } from 'hono';

import type { ArticleUseCases, CreateArticleCommand, FindArticlesQuery } from '../../../../application/inbound/ports/use-cases/article.use-cases.js';

import { ArticleCategory } from '../../../../domain/value-objects/article-category.vo.js';
import { ArticleCountry } from '../../../../domain/value-objects/article-country.vo.js';
import { ArticleLanguage } from '../../../../domain/value-objects/article-language.vo.js';

export class ArticleController {
    constructor(private readonly articleUseCases: ArticleUseCases) {}

    async getLatest(c: Context) {
        const article = await this.articleUseCases.findLatest();
        if (!article) {
            return c.json({ error: 'No articles found' }, 404);
        }
        return c.json(article);
    }

    async findMany(c: Context) {
        const cursor = c.req.query('cursor');
        const query: FindArticlesQuery = {
            category: this.parseEnum(c.req.query('category'), ArticleCategory),
            country: this.parseEnum(c.req.query('country'), ArticleCountry),
            cursor: cursor ? new Date(cursor) : undefined,
            language: this.parseEnum(c.req.query('language'), ArticleLanguage),
            limit: Number(c.req.query('limit')) || 10,
        };

        const result = await this.articleUseCases.findMany(query);
        return c.json(result);
    }

    async createMany(c: Context) {
        const commands = await c.req.json<CreateArticleCommand[]>();
        const articles = await this.articleUseCases.createMany(commands);
        return c.json(articles, 201);
    }

    async markAsFake(c: Context) {
        const id = c.req.param('id');
        const { reason } = await c.req.json<{ reason: string }>();
        const article = await this.articleUseCases.markAsFake(id, reason);
        return c.json(article);
    }

    private parseEnum<T>(value: string | undefined, enumType: { [key: string]: T }): T | undefined {
        if (!value) return undefined;
        return enumType[value as keyof typeof enumType];
    }
} 