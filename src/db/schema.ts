import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Employees table
export const employees = sqliteTable("employees", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    jobType: text("job_type", { enum: ["Pharmacist", "Assistant", "PartTime", "Other"] }).notNull().default("Pharmacist"),
    alias: text("alias"),
    wardDay: text("ward_day"), // Optional: e.g., 'monday'
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Shifts table
export const shifts = sqliteTable("shifts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
    date: text("date").notNull(), // ISO Date string: YYYY-MM-DD
    type: text("type").notNull(), // Specific shift type
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Schedules table (for both date-specific and monthly recurring events)
export const schedules = sqliteTable("schedules", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }), // Nullable for global events
    type: text("type", { enum: ["date_specific", "monthly_recurring"] }).notNull(),

    // For date_specific
    date: text("date"), // YYYY-MM-DD

    // For monthly_recurring
    weekNumber: integer("week_number"), // 1-5
    dayOfWeek: integer("day_of_week"), // 0-6 (Sun-Sat)

    text: text("text").notNull(),
    shortText: text("short_text"),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    displayType: text("display_type", { enum: ["full", "short"] }).notNull().default("full"),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// AM Task Options table
export const amTaskOptions = sqliteTable("am_task_options", {
    id: text("id").primaryKey(), // using text id: 't1', 't2', etc. generated in frontend or DB layer
    name: text("name").notNull(),
    bgColor: text("bg_color").notNull().default('bg-slate-100'),
    textColor: text("text_color").notNull().default('text-slate-800'),
    displayOrder: integer("display_order").notNull().default(0),
    isFallback: integer("is_fallback", { mode: "boolean" }).notNull().default(false),
    excludeFromAuto: integer("exclude_from_auto", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// AM Assignments table
export const amAssignments = sqliteTable("am_assignments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
    date: text("date").notNull(), // ISO Date string: YYYY-MM-DD
    taskName: text("task_name").notNull(), // can be an option name or free text
    isAutoAssigned: integer("is_auto_assigned", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});
// PM Assignments table
export const pmAssignments = sqliteTable("pm_assignments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
    date: text("date").notNull(), // ISO Date string: YYYY-MM-DD
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});
