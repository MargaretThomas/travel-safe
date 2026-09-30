CREATE TABLE `app_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`interval_minutes` integer DEFAULT 10080 NOT NULL,
	`protect_settings` integer DEFAULT true NOT NULL,
	`protect_check_in` integer DEFAULT false NOT NULL,
	`journey_sharing` integer DEFAULT false NOT NULL,
	`status_json` text,
	`status_fetched_at` text,
	`last_sync_at` text,
	`profile_created_at` text,
	CONSTRAINT "app_state_single_row" CHECK("app_state"."id" = 1),
	CONSTRAINT "app_state_interval_range" CHECK("app_state"."interval_minutes" BETWEEN 60 AND 525600)
);
--> statement-breakpoint
CREATE TABLE `archived_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`archived_at` text NOT NULL,
	`purge_after` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_archived_purge` ON `archived_profiles` (`purge_after`);--> statement-breakpoint
CREATE TABLE `check_ins` (
	`client_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`source` text DEFAULT 'check_in' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`latitude` real,
	`longitude` real,
	`accuracy_m` real,
	`location_recorded_at` text,
	`battery_level` real,
	`low_power_mode` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "check_ins_source" CHECK("check_ins"."source" IN ('check_in', 'foreground', 'background')),
	CONSTRAINT "check_ins_error" CHECK("check_ins"."last_error" IS NULL OR "check_ins"."last_error" IN ('offline', 'auth', 'server')),
	CONSTRAINT "check_ins_attempts" CHECK("check_ins"."attempts" >= 0),
	CONSTRAINT "check_ins_location_complete" CHECK(("check_ins"."latitude" IS NULL AND "check_ins"."longitude" IS NULL) OR ("check_ins"."latitude" IS NOT NULL AND "check_ins"."longitude" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `idx_check_ins_queue` ON `check_ins` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `deadman_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`deadline_at` text NOT NULL,
	`triggered_at` text NOT NULL,
	`status` text NOT NULL,
	`resolved_at` text,
	`last_check_in_at` text,
	`latitude` real,
	`longitude` real,
	`accuracy_m` real,
	`location_recorded_at` text,
	`address` text,
	`battery_level` real,
	`location_purge_after` text NOT NULL,
	`location_scrubbed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "events_status" CHECK("deadman_events"."status" IN ('triggered', 'resolved'))
);
--> statement-breakpoint
CREATE INDEX `idx_events_user` ON `deadman_events` (`user_id`,`triggered_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_deadline` ON `deadman_events` (`user_id`,`deadline_at`);--> statement-breakpoint
CREATE INDEX `idx_events_purge` ON `deadman_events` (`location_purge_after`);--> statement-breakpoint
CREATE TABLE `emergency_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`whatsapp` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contacts_has_channel" CHECK("emergency_contacts"."email" IS NOT NULL OR "emergency_contacts"."phone" IS NOT NULL),
	CONSTRAINT "contacts_whatsapp_needs_phone" CHECK("emergency_contacts"."whatsapp" = 0 OR "emergency_contacts"."phone" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `idx_contacts_user` ON `emergency_contacts` (`user_id`);--> statement-breakpoint
CREATE TABLE `emergency_links` (
	`id` text PRIMARY KEY NOT NULL,
	`deadman_event_id` text NOT NULL,
	`notification_event_id` text,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`last_accessed_at` text,
	FOREIGN KEY (`deadman_event_id`) REFERENCES `deadman_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`notification_event_id`) REFERENCES `notification_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_links_token_hash` ON `emergency_links` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_links_expiry` ON `emergency_links` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_links_event` ON `emergency_links` (`deadman_event_id`);--> statement-breakpoint
CREATE TABLE `last_known_locations` (
	`user_id` text PRIMARY KEY NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy_m` real,
	`recorded_at` text NOT NULL,
	`received_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `local_migrations` (
	`id` text PRIMARY KEY NOT NULL,
	`applied_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy_m` real,
	`recorded_at` text NOT NULL,
	`received_at` text NOT NULL,
	`source` text NOT NULL,
	`deadman_event_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deadman_event_id`) REFERENCES `deadman_events`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "locations_source" CHECK("locations"."source" IN ('check_in', 'foreground', 'background')),
	CONSTRAINT "locations_lat_range" CHECK("locations"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "locations_lng_range" CHECK("locations"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE INDEX `idx_locations_user_recorded` ON `locations` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_locations_recorded` ON `locations` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_locations_event` ON `locations` (`deadman_event_id`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`deadman_event_id` text NOT NULL,
	`contact_id` text,
	`notification_type` text DEFAULT 'emergency_alert' NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`recipient_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retryable` integer DEFAULT true NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`provider_message_id` text,
	`failure_reason` text,
	`created_at` text NOT NULL,
	`sent_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deadman_event_id`) REFERENCES `deadman_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `emergency_contacts`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "notification_channel" CHECK("notification_events"."channel" IN ('email', 'whatsapp')),
	CONSTRAINT "notification_status" CHECK("notification_events"."status" IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_status` ON `notification_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_notifications_provider` ON `notification_events` (`provider_message_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notifications_event_contact` ON `notification_events` (`deadman_event_id`,`contact_id`,`channel`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text,
	`check_in_interval_minutes` integer DEFAULT 10080 NOT NULL,
	`switch_state` text DEFAULT 'inactive' NOT NULL,
	`last_check_in_at` text,
	`next_deadline_at` text,
	`battery_level` real,
	`low_power_mode` integer,
	`device_reported_at` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "users_interval_range" CHECK("users"."check_in_interval_minutes" BETWEEN 60 AND 525600),
	CONSTRAINT "users_switch_state" CHECK("users"."switch_state" IN ('inactive', 'armed', 'triggered', 'archived')),
	CONSTRAINT "users_battery_range" CHECK("users"."battery_level" IS NULL OR "users"."battery_level" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE INDEX `idx_users_state_deadline` ON `users` (`switch_state`,`next_deadline_at`);