import type { ArticleRepository } from '../../domain/repositories/article.repository.js';

import { PrismaArticleRepository } from './prisma-article.repository.js';

export function createArticleRepository(): ArticleRepository {
    return new PrismaArticleRepository();
} 