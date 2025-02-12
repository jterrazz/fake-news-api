import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const ensureDatabaseFolder = () => {
    const dbDir = path.join(process.cwd(), 'db');
    if (!fs.existsSync(dbDir)) {
        console.log('Creating database directory');
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return dbDir;
};

export const setupDatabase = () => {
    const dbDir = ensureDatabaseFolder();
    const dbPath = path.join(dbDir, 'sqlite.db');

    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite);

    // Create tables if they don't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            headline TEXT NOT NULL,
            article TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN (
                'WORLD',
                'POLITICS',
                'BUSINESS',
                'TECHNOLOGY',
                'SCIENCE',
                'HEALTH',
                'SPORTS',
                'ENTERTAINMENT',
                'LIFESTYLE',
                'OTHER'
            )),
            country TEXT NOT NULL CHECK(country IN ('us', 'fr')),
            created_at INTEGER NOT NULL,
            is_fake INTEGER NOT NULL CHECK(is_fake IN (0, 1)),
            language TEXT NOT NULL CHECK(language IN ('en', 'fr')) DEFAULT 'en',
            summary TEXT NOT NULL DEFAULT ''
        )
    `);

    console.log('Database initialized');

    return db;
};

export type Database = ReturnType<typeof setupDatabase>;
