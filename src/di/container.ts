import { Container, Injectable } from '@snap/ts-inject';
import { default as nodeConfiguration } from 'config';

import { ConfigurationService } from '../application/services/configuration.service.js';

import type { ArticleRepository } from '../domain/repositories/article.repository.js';

import type { DatabaseClient } from '../infra/database/client.js';
import { databaseClient } from '../infra/database/client.js';
import { PrismaArticleRepository } from '../infra/repositories/prisma-article.repository.js';

/**
 * Service dependencies
 */
const configurationServiceFactory = Injectable(
    'ConfigurationService',
    () => new ConfigurationService(nodeConfiguration),
);

/**
 * Infrastructure dependencies
 */
const databaseClientFactory = Injectable('DatabaseClient', () => databaseClient);

/**
 * Repository dependencies
 */
const articleRepositoryFactory = Injectable(
    'ArticleRepository',
    ['DatabaseClient'] as const,
    (db: DatabaseClient) => new PrismaArticleRepository(db),
);

/**
 * Application container configuration
 */
export const container = Container
    // Services
    .provides(configurationServiceFactory)
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

export const getConfigurationService = (): ConfigurationService => {
    return container.get('ConfigurationService');
};
