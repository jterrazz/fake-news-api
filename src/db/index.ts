import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const ensureDatabaseFolder = () => {
    // Use environment variable to allow overriding the database path
    const dbDir = process.env.DB_PATH || path.join(process.cwd(), 'db');
    if (!fs.existsSync(dbDir)) {
        console.log('Creating database directory');
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return dbDir;
};

export const setupDatabase = async () => {
    try {
        const dbDir = ensureDatabaseFolder();
        const dbPath = path.join(dbDir, 'sqlite.db');

        const sqlite = new Database(dbPath);
        const db = drizzle(sqlite);

        // Create tables directly
        console.log('Creating tables...');
        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                article TEXT NOT NULL,
                category TEXT NOT NULL CHECK(category IN ('WORLD', 'POLITICS', 'BUSINESS', 'TECHNOLOGY', 'SCIENCE', 'HEALTH', 'SPORTS', 'ENTERTAINMENT', 'LIFESTYLE', 'OTHER')),
                country TEXT NOT NULL CHECK(country IN ('us', 'fr')),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fake_reason TEXT,
                headline TEXT NOT NULL,
                is_fake BOOLEAN NOT NULL,
                language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en', 'fr')),
                summary TEXT NOT NULL
            );
        `);
        console.log('Tables created successfully');

        return db;
    } catch (error) {
        console.error('Failed to setup database:', error);
        throw error;
    }
};

export type Database = Awaited<ReturnType<typeof setupDatabase>>;
