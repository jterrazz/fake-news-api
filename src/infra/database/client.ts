import { PrismaClient } from '@prisma/client';

export interface DatabaseClient {
    prisma: PrismaClient;
}

export class PrismaDatabaseClient implements DatabaseClient {
    private static instance: PrismaClient;

    constructor() {
        if (!PrismaDatabaseClient.instance) {
            PrismaDatabaseClient.instance = new PrismaClient({
                log: ['error', 'warn'],
            });
        }
    }

    get prisma(): PrismaClient {
        return PrismaDatabaseClient.instance;
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}

// Create a singleton instance
const databaseClient = new PrismaDatabaseClient();

// Ensure the client is properly closed when the app exits
process.on('beforeExit', async () => {
    await databaseClient.disconnect();
});

export { databaseClient };
