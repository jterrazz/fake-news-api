import { PrismaClient } from '@prisma/client';

import { DatabasePort } from '../../../../application/ports/outbound/external/database.port.js';

export class PrismaAdapter implements DatabasePort {
    private static instance: PrismaClient | null = null;
    private client: PrismaClient;

    constructor() {
        if (!PrismaAdapter.instance) {
            PrismaAdapter.instance = new PrismaClient({
                log: ['error', 'warn'],
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

// Create a singleton instance
export const databaseAdapter = new PrismaAdapter();
