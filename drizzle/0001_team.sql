CREATE TABLE team_members (email TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, subject TEXT UNIQUE, active INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE team_stores (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, assignee TEXT);
--> statement-breakpoint
CREATE INDEX idx_team_store_assignee ON team_stores(assignee);
--> statement-breakpoint
CREATE TABLE team_assets (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, store_id TEXT NOT NULL REFERENCES team_stores(id));
