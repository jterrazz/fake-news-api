import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../database/fake-news.db');

export const setupDatabase = () => {
    const sqlite = new Database(DB_PATH);
    const db = drizzle(sqlite);

    // Create tables if they don't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            headline TEXT NOT NULL,
            article TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('SCIENCE', 'TECHNOLOGY', 'HEALTH', 'ENVIRONMENT', 'SPACE')),
            created_at INTEGER NOT NULL,
            is_fake INTEGER NOT NULL CHECK(is_fake IN (0, 1))
        )
    `);

    console.log('Database initialized');

    return db;
};

export type Database = ReturnType<typeof setupDatabase>;
