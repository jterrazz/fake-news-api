import { Container, Injectable } from '@snap/ts-inject';
import { default as nodeConfiguration } from 'config';

import type { ConfigurationPort } from '../application/ports/inbound/configuration.port.js';

import type { HttpServerPort } from '../application/ports/inbound/http-server.port.js';
import type { JobRunnerPort } from '../application/ports/inbound/job-runner.port.js';
import { type Job } from '../application/ports/inbound/job-runner.port.js';
import type { NewsPort } from '../application/ports/outbound/data-sources/news.port.js';
import type { LoggerPort } from '../application/ports/outbound/logging/logger.port.js';
import type { ArticleRepository } from '../application/ports/outbound/persistence/article.repository.port.js';
import type { DatabasePort } from '../application/ports/outbound/persistence/database.port.js';
import { GenerateArticlesUseCase } from '../application/use-cases/articles/generate-articles.use-case.js';

import { NodeConfigAdapter } from '../infrastructure/inbound/configuration/node-config.adapter.js';
import { HonoServerAdapter } from '../infrastructure/inbound/http-server/hono.adapter.js';
import { createArticleGenerationJob } from '../infrastructure/inbound/job-runner/articles/article-generation.job.js';
import { NodeCronAdapter } from '../infrastructure/inbound/job-runner/node-cron.adapter.js';
import { CachedNewsAdapter } from '../infrastructure/outbound/data-sources/cached-news.adapter.js';
import { WorldNewsAdapter } from '../infrastructure/outbound/data-sources/world-news.adapter.js';
import { PinoLoggerAdapter } from '../infrastructure/outbound/logging/pino.adapter.js';
import {
    databaseAdapter,
    PrismaAdapter,
} from '../infrastructure/outbound/persistence/prisma/prisma.adapter.js';
import { PrismaArticleRepository } from '../infrastructure/outbound/persistence/prisma/repositories/article.adapter.js';

/**
 * Inbound adapters
 */
const configurationFactory = Injectable(
    'Configuration',
    () => new NodeConfigAdapter(nodeConfiguration),
);

const httpServerFactory = Injectable('HttpServer', () => new HonoServerAdapter());

const jobRunnerFactory = Injectable(
    'JobRunner',
    ['Logger', 'Jobs'] as const,
    (logger: LoggerPort, jobs: Job[]): JobRunnerPort => new NodeCronAdapter(logger, jobs),
);

/**
 * Outbound adapters
 */
const databaseFactory = Injectable('Database', () => databaseAdapter);

const loggerFactory = Injectable(
    'Logger',
    ['Configuration'] as const,
    (config: ConfigurationPort) =>
        new PinoLoggerAdapter(config, {
            formatters: {
                level: (label) => ({ level: label }),
            },
            name: 'app',
        }),
);

const newsFactory = Injectable(
    'News',
    ['Configuration', 'Logger'] as const,
    (config: ConfigurationPort, logger: LoggerPort) => {
        const newsAdapter = new WorldNewsAdapter(config);
        return new CachedNewsAdapter(newsAdapter, logger);
    },
);

/**
 * Repository adapters
 */
const articleRepositoryFactory = Injectable(
    'ArticleRepository',
    ['Database'] as const,
    (db: PrismaAdapter) => new PrismaArticleRepository(db),
);

/**
 * Use case factories
 */
const generateArticlesUseCaseFactory = Injectable(
    'GenerateArticles',
    ['ArticleRepository', 'Logger', 'News'] as const,
    (articleRepository: ArticleRepository, logger: LoggerPort, newsService: NewsPort) =>
        new GenerateArticlesUseCase({
            articleRepository,
            logger,
            newsService,
        }),
);

/**
 * Job factories
 */
const jobsFactory = Injectable(
    'Jobs',
    ['GenerateArticles'] as const,
    (generateArticles: GenerateArticlesUseCase): Job[] => {
        return [
            createArticleGenerationJob({
                generateArticles,
            }),
            // Add more jobs here
        ];
    },
);

/**
 * Application container configuration
 */
export const container = Container
    // Inbound adapters
    .provides(configurationFactory)
    .provides(httpServerFactory)
    // Outbound adapters
    .provides(databaseFactory)
    .provides(loggerFactory)
    .provides(newsFactory)
    // Repository adapters
    .provides(articleRepositoryFactory)
    // Use cases
    .provides(generateArticlesUseCaseFactory)
    // Jobs
    .provides(jobsFactory)
    .provides(jobRunnerFactory);

/**
 * Type-safe dependency accessors
 */
export const getConfiguration = (): ConfigurationPort => {
    return container.get('Configuration');
};

export const getArticleRepository = (): ArticleRepository => {
    return container.get('ArticleRepository');
};

export const getLogger = (): LoggerPort => {
    return container.get('Logger');
};

export const getDatabase = (): DatabasePort => {
    return container.get('Database');
};

export const getHttpServer = (): HttpServerPort => {
    return container.get('HttpServer');
};

export const getJobRunner = (): JobRunnerPort => {
    return container.get('JobRunner');
};

export const getNews = (): NewsPort => {
    return container.get('News');
};

export const getJobs = (): Job[] => {
    return container.get('Jobs');
};
