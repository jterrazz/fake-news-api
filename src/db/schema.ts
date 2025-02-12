import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const articles = sqliteTable('articles', {
    article: text('article').notNull(),
    category: text('category', {
        enum: [
            'WORLD',
            'POLITICS',
            'BUSINESS',
            'TECHNOLOGY',
            'SCIENCE',
            'HEALTH',
            'SPORTS',
            'ENTERTAINMENT',
            'LIFESTYLE',
            'OTHER',
        ],
    }).notNull(),
    country: text('country', { enum: ['us', 'fr'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    headline: text('headline').notNull(),
    id: text('id').primaryKey(),
    isFake: integer('is_fake', { mode: 'boolean' }).notNull(),
    language: text('language', { enum: ['en', 'fr'] }).notNull().default('en'),
    summary: text('summary').notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;
