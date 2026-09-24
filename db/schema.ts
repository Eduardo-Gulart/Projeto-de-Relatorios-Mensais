import { sqliteTable, text, index, integer } from 'drizzle-orm/sqlite-core';
export const reports = sqliteTable('reports', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), payload: text('payload').notNull(), updated: text('updated').notNull()
}, t => [index('idx_reports_owner').on(t.owner)]);

export const teamMembers = sqliteTable('team_members',{email:text('email').primaryKey(),name:text('name').notNull(),subject:text('subject').unique(),active:integer('active').notNull().default(1)});
export const teamStores = sqliteTable('team_stores',{id:text('id').primaryKey(),name:text('name').notNull(),assignee:text('assignee')},t=>[index('idx_team_store_assignee').on(t.assignee)]);
export const teamAssets = sqliteTable('team_assets',{id:text('id').primaryKey(),owner:text('owner').notNull(),storeId:text('store_id').notNull().references(()=>teamStores.id)});
