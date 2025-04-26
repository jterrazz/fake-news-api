import { type LoggerPort } from '@jterrazz/logger';
import { type Prisma, PrismaClient } from '@prisma/client';

import { type DatabasePort } from '../../../../application/ports/outbound/persistence/database.port.js';

export class PrismaAdapter implements DatabasePort {
    private static instance: null | PrismaClient = null;
    private client: PrismaClient;

    constructor(private readonly logger: LoggerPort) {
        if (!PrismaAdapter.instance) {
            PrismaAdapter.instance = new PrismaClient({
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

            PrismaAdapter.instance.$on('error' as never, (event: Prisma.LogEvent) => {
                this.logger.error(`Prisma error: ${event.message}`, {
                    ...event,
                });
            });

            PrismaAdapter.instance.$on('warn' as never, (event: Prisma.LogEvent) => {
                this.logger.warn(`Prisma warning: ${event.message}`, {
                    ...event,
                });
            });

            PrismaAdapter.instance.$on('info' as never, (event: Prisma.LogEvent) => {
                this.logger.info(`Prisma info: ${event.message}`, {
                    ...event,
                });
            });

            PrismaAdapter.instance.$on('query' as never, (event: Prisma.LogEvent) => {
                this.logger.info(`Prisma query: ${event.message}`, {
                    ...event,
                });
            });
        }
        this.client = PrismaAdapter.instance;
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
