import { type LoggerPort, PinoLoggerAdapter } from '@jterrazz/logger';
import {
    type MonitoringPort,
    NewRelicMonitoringAdapter,
    NoopMonitoringAdapter,
} from '@jterrazz/monitoring';
import { Container, Injectable } from '@snap/ts-inject';
import { default as nodeConfiguration } from 'config';

import type { ConfigurationPort } from '../application/ports/inbound/configuration.port.js';

import type { ExecutorPort } from '../application/ports/inbound/executor.port.js';
import { type TaskPort } from '../application/ports/inbound/executor.port.js';
import type { ServerPort } from '../application/ports/inbound/server.port.js';
import { type ArticleGeneratorPort } from '../application/ports/outbound/ai/article-generator.port.js';
import { type AIProviderPort } from '../application/ports/outbound/ai/provider.port.js';
import type { NewsPort } from '../application/ports/outbound/data-sources/news.port.js';
import type { ArticleRepositoryPort } from '../application/ports/outbound/persistence/article-repository.port.js';
import { GenerateArticlesUseCase } from '../application/use-cases/articles/generate-articles.use-case.js';
import { GetArticlesUseCase } from '../application/use-cases/articles/get-articles.use-case.js';

import { NodeConfigAdapter } from '../infrastructure/inbound/configuration/node-config.adapter.js';
import { NodeCronAdapter } from '../infrastructure/inbound/executor/node-cron.adapter.js';
import { ArticleGenerationTask } from '../infrastructure/inbound/executor/tasks/article-generation.task.js';
import { GetArticlesController } from '../infrastructure/inbound/server/articles/article.controller.js';
import { HonoServerAdapter } from '../infrastructure/inbound/server/hono.adapter.js';
import { AIArticleGenerator } from '../infrastructure/outbound/ai/article-generator.adapter.js';
import { OpenRouterAdapter } from '../infrastructure/outbound/ai/providers/open-router.adapter.js';
import { CachedNewsAdapter } from '../infrastructure/outbound/data-sources/cached-news.adapter.js';
import { WorldNewsAdapter } from '../infrastructure/outbound/data-sources/world-news.adapter.js';
import { PrismaAdapter } from '../infrastructure/outbound/persistence/prisma.adapter.js';
import { PrismaArticleRepository } from '../infrastructure/outbound/persistence/prisma-article.adapter.js';

/**
 * Outbound adapters
 */
const databaseFactory = Injectable(
    'Database',
    ['Logger', 'Configuration'] as const,
    (logger: LoggerPort, config: ConfigurationPort) =>
        new PrismaAdapter(logger, config.getOutboundConfiguration().prisma.databaseUrl),
);

const loggerFactory = Injectable(
    'Logger',
    ['Configuration'] as const,
    (config: ConfigurationPort) =>
        new PinoLoggerAdapter({
            level: config.getInboundConfiguration().logger.level,
            prettyPrint: config.getInboundConfiguration().logger.prettyPrint,
        }),
);

const newsFactory = Injectable(
    'News',
    ['Configuration', 'Logger', 'NewRelic'] as const,
    (config: ConfigurationPort, logger: LoggerPort, monitoring: MonitoringPort) => {
        logger.info('Initializing WorldNews adapter');
        const newsAdapter = new WorldNewsAdapter(
            {
                apiKey: config.getOutboundConfiguration().worldNews.apiKey,
            },
            logger,
            monitoring,
        );
        const useCache = config.getOutboundConfiguration().worldNews.useCache;

        if (useCache) {
            logger.info('Initializing CachedNews adapter');
            const cachedNewsAdapter = new CachedNewsAdapter(
                newsAdapter,
                logger,
                config.getInboundConfiguration().env,
            );
            return cachedNewsAdapter;
        }

        return newsAdapter;
    },
);

const aiProviderFactory = Injectable(
    'AIProvider',
    ['Configuration', 'Logger', 'NewRelic'] as const,
    (config: ConfigurationPort, logger: LoggerPort, monitoring: MonitoringPort) => {
        return new OpenRouterAdapter(logger, monitoring, {
            apiKey: config.getOutboundConfiguration().openRouter.apiKey,
            budget: config.getOutboundConfiguration().openRouter.budget,
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
    ['Database', 'Logger'] as const,
    (db: PrismaAdapter, logger: LoggerPort) => {
        logger.info('Initializing Prisma article repository');
        const articleRepository = new PrismaArticleRepository(db);
        return articleRepository;
    },
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
const getArticlesControllerFactory = Injectable(
    'GetArticlesController',
    ['GetArticles'] as const,
    (getArticles: GetArticlesUseCase) => new GetArticlesController(getArticles),
);

/**
 * Task factories
 */
const tasksFactory = Injectable(
    'Tasks',
    ['GenerateArticles', 'Logger'] as const,
    (generateArticles: GenerateArticlesUseCase, logger: LoggerPort): TaskPort[] => {
        return [new ArticleGenerationTask(generateArticles, logger)];
    },
);

/**
 * Monitoring adapters
 */
const newRelicFactory = Injectable(
    'NewRelic',
    ['Configuration', 'Logger'] as const,
    (config: ConfigurationPort, logger: LoggerPort): MonitoringPort => {
        const outboundConfig = config.getOutboundConfiguration();

        if (!outboundConfig.newRelic.enabled) {
            return new NoopMonitoringAdapter(logger);
        }

        logger.info('Initializing NewRelic adapter');
        return new NewRelicMonitoringAdapter({
            environment: config.getInboundConfiguration().env,
            licenseKey: outboundConfig.newRelic.licenseKey,
            logger,
        });
    },
);

/**
 * Inbound adapters
 */
const configurationFactory = (overrides?: ContainerOverrides) =>
    Injectable('Configuration', () => new NodeConfigAdapter(nodeConfiguration, overrides));

const serverFactory = Injectable(
    'Server',
    ['Logger', 'GetArticlesController'] as const,
    (logger: LoggerPort, getArticlesController: GetArticlesController): ServerPort => {
        logger.info('Initializing Hono server');
        const server = new HonoServerAdapter(logger, getArticlesController);
        return server;
    },
);

const executorFactory = Injectable(
    'Executor',
    ['Logger', 'Tasks'] as const,
    (logger: LoggerPort, tasks: TaskPort[]): ExecutorPort => {
        logger.info('Initializing NodeCron executor');
        const executor = new NodeCronAdapter(logger, tasks);
        return executor;
    },
);

/**
 * Container configuration
 */
export type ContainerOverrides = {
    databaseUrl?: string;
};

export const createContainer = (overrides?: ContainerOverrides) =>
    Container
        // Outbound adapters
        .provides(configurationFactory(overrides))
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
        // Controllers and tasks
        .provides(getArticlesControllerFactory)
        .provides(tasksFactory)
        // Inbound adapters
        .provides(serverFactory)
        .provides(executorFactory);
