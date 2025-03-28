import { Container, Injectable } from '@snap/ts-inject';
import { default as nodeConfiguration } from 'config';

import type { ConfigurationPort } from '../application/ports/inbound/configuration.port.js';

import type { HttpServerPort } from '../application/ports/inbound/http-server.port.js';
import type { JobRunnerPort } from '../application/ports/inbound/job-runner.port.js';
import { type Job } from '../application/ports/inbound/job-runner.port.js';
import { type ArticleGeneratorPort } from '../application/ports/outbound/ai/article-generator.port.js';
import { type AIProviderPort } from '../application/ports/outbound/ai/provider.port.js';
import type { NewsPort } from '../application/ports/outbound/data-sources/news.port.js';
import type { LoggerPort } from '../application/ports/outbound/logging/logger.port.js';
import type { ArticleRepositoryPort } from '../application/ports/outbound/persistence/article-repository.port.js';
import { GenerateArticlesUseCase } from '../application/use-cases/articles/generate-articles.use-case.js';
import { GetArticlesUseCase } from '../application/use-cases/articles/get-articles.use-case.js';

import { NodeConfigAdapter } from '../infrastructure/inbound/configuration/node-config.adapter.js';
import { ArticleController } from '../infrastructure/inbound/http-server/controllers/article.controller.js';
import { HonoServerAdapter } from '../infrastructure/inbound/http-server/hono.adapter.js';
import { createArticleGenerationJob } from '../infrastructure/inbound/job-runner/articles/article-generation.job.js';
import { NodeCronAdapter } from '../infrastructure/inbound/job-runner/node-cron.adapter.js';
import { AIArticleGenerator } from '../infrastructure/outbound/ai/article-generator.adapter.js';
import { OpenRouterAdapter } from '../infrastructure/outbound/ai/providers/open-router.adapter.js';
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

const httpServerFactory = Injectable(
    'HttpServer',
    ['Logger'] as const,
    (logger: LoggerPort): HttpServerPort => {
        return new HonoServerAdapter(logger);
    },
);

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
        // TODO Fix config leak
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
    // TODO Fix config leak
    (config: ConfigurationPort, logger: LoggerPort) => {
        const newsAdapter = new WorldNewsAdapter(config, logger);
        const useCache = config.getApiConfiguration().worldNews.useCache;

        return useCache ? new CachedNewsAdapter(newsAdapter, logger, config) : newsAdapter;
    },
);

const aiProviderFactory = Injectable(
    'AIProvider',
    ['Configuration', 'Logger'] as const,
    // TODO Fix config leak
    (config: ConfigurationPort, logger: LoggerPort) =>
        new OpenRouterAdapter({
            config,
            logger,
        }),
);

/**
 * Repository adapters
 */
const articleRepositoryFactory = Injectable(
    'ArticleRepository',
    ['Database'] as const,
    (db: PrismaAdapter) => new PrismaArticleRepository(db),
);

const articleGeneratorFactory = Injectable(
    'ArticleGenerator',
    ['AIProvider', 'Logger'] as const,
    (aiProvider: AIProviderPort, logger: LoggerPort) =>
        new AIArticleGenerator({
            aiProvider,
            logger,
        }),
);

/**
 * Use case factories
 */
const generateArticlesUseCaseFactory = Injectable(
    'GenerateArticles',
    ['ArticleRepository', 'Logger', 'News', 'ArticleGenerator'] as const,
    (
        articleRepository: ArticleRepositoryPort,
        logger: LoggerPort,
        newsService: NewsPort,
        articleGenerator: ArticleGeneratorPort,
    ) =>
        new GenerateArticlesUseCase({
            articleGenerator,
            articleRepository,
            logger,
            newsService,
        }),
);

const getArticlesUseCaseFactory = Injectable(
    'GetArticles',
    ['ArticleRepository'] as const,
    (articleRepository: ArticleRepositoryPort) => new GetArticlesUseCase(articleRepository),
);

/**
 * Controller factories
 */
const articleControllerFactory = Injectable(
    'ArticleController',
    ['GetArticles'] as const,
    (getArticles: GetArticlesUseCase) => new ArticleController(getArticles),
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
    // Adapters
    .provides(configurationFactory)
    .provides(loggerFactory)
    .provides(httpServerFactory)
    .provides(databaseFactory)
    .provides(newsFactory)
    .provides(aiProviderFactory)
    // Repository adapters
    .provides(articleRepositoryFactory)
    .provides(articleGeneratorFactory)
    // Use cases
    .provides(generateArticlesUseCaseFactory)
    .provides(getArticlesUseCaseFactory)
    // Controllers
    .provides(articleControllerFactory)
    // Jobs
    .provides(jobsFactory)
    .provides(jobRunnerFactory);

/**
 * Type-safe dependency accessors
 */
export const getConfiguration = (): ConfigurationPort => {
    return container.get('Configuration');
};

export const getLogger = (): LoggerPort => {
    return container.get('Logger');
};

export const getHttpServer = (): HttpServerPort => {
    return container.get('HttpServer');
};

export const getJobRunner = (): JobRunnerPort => {
    return container.get('JobRunner');
};

export const getArticleController = (): ArticleController => {
    return container.get('ArticleController');
};
