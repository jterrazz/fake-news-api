import { Container, Injectable } from '@snap/ts-inject';
import { default as nodeConfiguration } from 'config';

import type { ConfigurationPort } from '../application/ports/inbound/configuration.port.js';

import type { HttpServerPort } from '../application/ports/inbound/http-server.port.js';
import type { JobRunnerPort } from '../application/ports/inbound/job-runner.port.js';
import type { DatabasePort } from '../application/ports/outbound/external/database.port.js';
import type { LoggerPort } from '../application/ports/outbound/logging/logger.port.js';
import type { ArticleRepository } from '../application/ports/outbound/persistence/article.repository.port.js';

import { NodeConfigAdapter } from '../infrastructure/inbound/configuration/node-config.adapter.js';
import { HonoServerAdapter } from '../infrastructure/inbound/http-server/hono.adapter.js';
import { NodeCronAdapter } from '../infrastructure/inbound/jobs/node-cron.adapter.js';
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
    () => new HonoServerAdapter(),
);

const jobRunnerFactory = Injectable(
    'JobRunner',
    () => new NodeCronAdapter(),
);

/**
 * Outbound adapters
 */
const databaseFactory = Injectable('Database', () => databaseAdapter);

const loggerFactory = Injectable(
    'Logger',
    () =>
        new PinoLoggerAdapter({
            formatters: {
                level: (label) => ({ level: label }),
            },
            name: 'app',
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

/**
 * Application container configuration
 */
export const container = Container
    // Inbound adapters
    .provides(configurationFactory)
    .provides(httpServerFactory)
    .provides(jobRunnerFactory)
    // Outbound adapters
    .provides(databaseFactory)
    .provides(loggerFactory)
    // Repository adapters
    .provides(articleRepositoryFactory);

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
