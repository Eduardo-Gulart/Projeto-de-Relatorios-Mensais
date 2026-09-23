import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
export const reports = sqliteTable('reports', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), payload: text('payload').notNull(), updated: text('updated').notNull()
}, t => [index('idx_reports_owner').on(t.owner)]);
