CREATE TABLE `am_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`task_name` text NOT NULL,
	`is_auto_assigned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `am_task_options` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bg_color` text DEFAULT 'bg-slate-100' NOT NULL,
	`text_color` text DEFAULT 'text-slate-800' NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_fallback` integer DEFAULT false NOT NULL,
	`exclude_from_auto` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`job_type` text DEFAULT 'Pharmacist' NOT NULL,
	`alias` text,
	`ward_day` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer,
	`type` text NOT NULL,
	`date` text,
	`week_number` integer,
	`day_of_week` integer,
	`text` text NOT NULL,
	`short_text` text,
	`is_visible` integer DEFAULT true NOT NULL,
	`display_type` text DEFAULT 'full' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
