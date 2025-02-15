import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client instance with connection pooling.
 * Used across the application for database operations.
 *
 * Error handling is built into Prisma Client:
 * - Automatic reconnection for lost connections
 * - Query retries for failed transactions
 * - Connection pooling for optimal performance
 */
const prisma = new PrismaClient({
    log: ['error', 'warn'],
});

// Ensure the client is properly closed when the app exits
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export { prisma };
