import { type PrismaClient } from '@prisma/client';

/**
 * Cleans up all data from the database
 * @param prisma PrismaClient instance
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
    // Note: Order matters due to foreign key constraints
    // await prisma.article.deleteMany();
}
