CREATE TABLE `diagnostics` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL
);

--> statement-breakpoint
CREATE INDEX `idx_diagnostics_owner_updated` ON `diagnostics` (`owner`,`updated`);
