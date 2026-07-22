CREATE TABLE `collectivite` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'commune' NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`address` text,
	`postal_code` text,
	`city` text,
	`phone` text,
	`email` text,
	`website` text,
	`theme` text,
	`social` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`role` text DEFAULT 'redacteur' NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_hash_unique` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'redacteur' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `medias` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`alt` text,
	`caption` text,
	`driver` text NOT NULL,
	`objects` text NOT NULL,
	`meta_data` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `actualites` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text,
	`content` text,
	`cover_media_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cover_media_id`) REFERENCES `medias`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actualites_slug_unique` ON `actualites` (`slug`);--> statement-breakpoint
CREATE TABLE `evenements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text,
	`content` text,
	`start_at` text NOT NULL,
	`end_at` text,
	`location` text,
	`cover_media_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cover_media_id`) REFERENCES `medias`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evenements_slug_unique` ON `evenements` (`slug`);--> statement-breakpoint
CREATE TABLE `elus` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`fonction` text,
	`delegation` text,
	`bio` text,
	`email` text,
	`photo_media_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`photo_media_id`) REFERENCES `medias`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `projets` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text,
	`content` text,
	`etat` text DEFAULT 'etude' NOT NULL,
	`start_at` text,
	`end_at` text,
	`cover_media_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cover_media_id`) REFERENCES `medias`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projets_slug_unique` ON `projets` (`slug`);--> statement-breakpoint
CREATE TABLE `deliberations` (
	`id` text PRIMARY KEY NOT NULL,
	`seance_id` text NOT NULL,
	`numero` text NOT NULL,
	`objet` text NOT NULL,
	`content` text,
	`vote_pour` integer,
	`vote_contre` integer,
	`vote_abstention` integer,
	`resultat` text,
	`fichier_media_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`seance_id`) REFERENCES `seances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fichier_media_id`) REFERENCES `medias`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `seances` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`ordre_du_jour` text,
	`compte_rendu` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `formulaires` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`fields` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `formulaires_slug_unique` ON `formulaires` (`slug`);--> statement-breakpoint
CREATE TABLE `soumissions` (
	`id` text PRIMARY KEY NOT NULL,
	`formulaire_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'nouvelle' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`formulaire_id`) REFERENCES `formulaires`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `collection_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`fields` text NOT NULL,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_definitions_slug_unique` ON `collection_definitions` (`slug`);--> statement-breakpoint
CREATE TABLE `collection_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`legacy_extra` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
