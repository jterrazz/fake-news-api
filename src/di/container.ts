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
import { createArticleGenerationJob } from '../infrastructure/inbound/job-runner/jobs/article-generation.job.js';
import { NodeCronAdapter } from '../infrastructure/inbound/job-runner/node-cron.adapter.js';
import { AIArticleGenerator } from '../infrastructure/outbound/ai/article-generator.adapter.js';
import { OpenRouterAdapter } from '../infrastructure/outbound/ai/providers/open-router.adapter.js';
import { CachedNewsAdapter } from '../infrastructure/outbound/data-sources/cached-news.adapter.js';
import { WorldNewsAdapter } from '../infrastructure/outbound/data-sources/world-news.adapter.js';
import { PinoLoggerAdapter } from '../infrastructure/outbound/logging/pino.adapter.js';
import { NewRelicAdapter } from '../infrastructure/outbound/monitoring/new-relic.adapter.js';
import { PrismaAdapter } from '../infrastructure/outbound/persistence/prisma/prisma.adapter.js';
import { PrismaArticleRepository } from '../infrastructure/outbound/persistence/prisma/repositories/article.adapter.js';

/**
 * Outbound adapters
 */
const databaseFactory = Injectable('Database', () => new PrismaAdapter());

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
    ['Configuration', 'Logger', 'NewRelic'] as const,
    // TODO Fix config leak
    (config: ConfigurationPort, logger: LoggerPort, newRelic: NewRelicAdapter) => {
        const newsAdapter = new WorldNewsAdapter(config, logger, newRelic);
        const useCache = config.getApiConfiguration().worldNews.useCache;

        return useCache ? new CachedNewsAdapter(newsAdapter, logger, config) : newsAdapter;
    },
);

const aiProviderFactory = Injectable(
    'AIProvider',
    ['Configuration', 'Logger', 'NewRelic'] as const,
    (config: ConfigurationPort, logger: LoggerPort, newRelic: NewRelicAdapter) => {
        return new OpenRouterAdapter(logger, newRelic, {
            apiKey: config.getApiConfiguration().openRouter.apiKey,
            budget: config.getAppConfiguration().env === 'production' ? 'paid' : 'free',
        });
    },
);

const articleGeneratorFactory = Injectable(
    'ArticleGenerator',
    ['AIProvider', 'Logger'] as const,
    (aiProvider: AIProviderPort, logger: LoggerPort) => new AIArticleGenerator(aiProvider, logger),
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
    ['ArticleRepository', 'Logger', 'News', 'ArticleGenerator'] as const,
    (
        articleRepository: ArticleRepositoryPort,
        logger: LoggerPort,
        newsService: NewsPort,
        articleGenerator: ArticleGeneratorPort,
    ) => new GenerateArticlesUseCase(articleGenerator, articleRepository, logger, newsService),
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
    ['GenerateArticles', 'NewRelic'] as const,
    (generateArticles: GenerateArticlesUseCase, monitoring: NewRelicAdapter): Job[] => {
        return [
            createArticleGenerationJob({
                generateArticles,
                monitoring,
            }),
        ];
    },
);

/**
 * Monitoring adapters
 */
const newRelicFactory = Injectable(
    'NewRelic',
    ['Configuration', 'Logger'] as const,
    (config: ConfigurationPort, logger: LoggerPort) => NewRelicAdapter.getInstance(config, logger),
);

/**
 * Inbound adapters
 */
const configurationFactory = Injectable(
    'Configuration',
    // TODO Fix config leak
    () => new NodeConfigAdapter(nodeConfiguration),
);

const httpServerFactory = Injectable(
    'HttpServer',
    ['Logger', 'ArticleController'] as const,
    (logger: LoggerPort, articleController: ArticleController): HttpServerPort => {
        return new HonoServerAdapter(logger, articleController);
    },
);

const jobRunnerFactory = Injectable(
    'JobRunner',
    ['Logger', 'Jobs'] as const,
    (logger: LoggerPort, jobs: Job[]): JobRunnerPort => new NodeCronAdapter(logger, jobs),
);

/**
 * Container configuration
 */
export const container = Container
    // Outbound adapters
    .provides(configurationFactory)
    .provides(loggerFactory)
    .provides(newRelicFactory)
    .provides(databaseFactory)
    .provides(newsFactory)
    .provides(aiProviderFactory)
    .provides(articleGeneratorFactory)
    // Repositories
    .provides(articleRepositoryFactory)
    // Use cases
    .provides(generateArticlesUseCaseFactory)
    .provides(getArticlesUseCaseFactory)
    // Controllers and jobs
    .provides(articleControllerFactory)
    .provides(jobsFactory)
    // Inbound adapters
    .provides(httpServerFactory)
    .provides(jobRunnerFactory);
