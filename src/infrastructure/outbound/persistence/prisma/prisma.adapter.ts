import { type LoggerPort } from '@jterrazz/logger';
import { type Prisma, PrismaClient } from '@prisma/client';

import { type DatabasePort } from '../../../../application/ports/outbound/persistence/database.port.js';

export class PrismaAdapter implements DatabasePort {
    private client: PrismaClient;

    constructor(private readonly logger: LoggerPort) {
        // TODO Move DATABASE_URL to a config file
        this.client = new PrismaClient({
            log: [
                {
                    emit: 'event',
                    level: 'query',
                },
                {
                    emit: 'event',
                    level: 'error',
                },
                {
                    emit: 'event',
                    level: 'info',
                },
                {
                    emit: 'event',
                    level: 'warn',
                },
            ],
        });

        this.client.$on('error' as never, (event: Prisma.LogEvent) => {
            this.logger.error(`Prisma: ${event.message}`, {
                ...event,
            });
        });

        this.client.$on('warn' as never, (event: Prisma.LogEvent) => {
            this.logger.warn(`Prisma: ${event.message}`, {
                ...event,
            });
        });

        this.client.$on('info' as never, (event: Prisma.LogEvent) => {
            this.logger.info(`Prisma: ${event.message}`, {
                ...event,
            });
        });

        this.client.$on('query' as never, (event: Prisma.LogEvent) => {
            this.logger.debug(`Prisma: Query`, {
                ...event,
            });
        });
    }

    async connect(): Promise<void> {
        await this.client.$connect();
    }

    async disconnect(): Promise<void> {
        await this.client.$disconnect();
    }

    getPrismaClient(): PrismaClient {
        return this.client;
    }
}
