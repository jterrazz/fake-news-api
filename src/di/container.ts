import { Container, Injectable } from '@snap/ts-inject';

import type { ArticleRepository } from '../domain/repositories/article.repository.js';

import type { DatabaseClient } from '../infra/database/client.js';
import { databaseClient } from '../infra/database/client.js';
import { PrismaArticleRepository } from '../infra/repositories/prisma-article.repository.js';

/**
 * Infrastructure dependencies
 */
const databaseClientFactory = Injectable(
    'DatabaseClient',
    () => databaseClient
);

/**
 * Repository dependencies
 */
const articleRepositoryFactory = Injectable(
    'ArticleRepository',
    ['DatabaseClient'] as const,
    (db: DatabaseClient) => new PrismaArticleRepository(db)
);

/**
 * Application container configuration
 */
export const container = Container
    // Infrastructure
    .provides(databaseClientFactory)
    // Repositories
    .provides(articleRepositoryFactory);

/**
 * Type-safe dependency accessors
 */
export const getArticleRepository = (): ArticleRepository => {
    return container.get('ArticleRepository');
}; 