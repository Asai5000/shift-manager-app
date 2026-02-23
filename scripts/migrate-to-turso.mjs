/**
 * ローカルSQLite (local.db) のデータをTursoに移行するスクリプト
 * 実行: node scripts/migrate-to-turso.mjs
 */

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
    console.error('❌ 環境変数 TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を設定してください');
    process.exit(1);
}

// ローカルDB
const localDb = new Database('local.db');

// Tursoクライアント
const turso = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
});

async function migrate() {
    try {
        console.log('🚀 データ移行を開始します...\n');

        // --- employees ---
        const employees = localDb.prepare('SELECT * FROM employees ORDER BY id').all();
        console.log(`👥 従業員: ${employees.length}件`);
        for (const emp of employees) {
            await turso.execute({
                sql: `INSERT OR REPLACE INTO employees (id, name, job_type, alias, ward_day, display_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [emp.id, emp.name, emp.job_type, emp.alias, emp.ward_day, emp.display_order, emp.created_at],
            });
        }

        // --- shifts ---
        const shifts = localDb.prepare('SELECT * FROM shifts ORDER BY id').all();
        console.log(`📅 シフト: ${shifts.length}件`);
        for (const shift of shifts) {
            await turso.execute({
                sql: `INSERT OR REPLACE INTO shifts (id, employee_id, date, type, created_at) VALUES (?, ?, ?, ?, ?)`,
                args: [shift.id, shift.employee_id, shift.date, shift.type, shift.created_at],
            });
        }

        // --- schedules ---
        const schedules = localDb.prepare('SELECT * FROM schedules ORDER BY id').all();
        console.log(`📋 予定: ${schedules.length}件`);
        for (const s of schedules) {
            await turso.execute({
                sql: `INSERT OR REPLACE INTO schedules (id, employee_id, type, date, week_number, day_of_week, text, short_text, is_visible, display_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [s.id, s.employee_id, s.type, s.date, s.week_number, s.day_of_week, s.text, s.short_text, s.is_visible, s.display_type, s.created_at],
            });
        }

        // --- am_task_options ---
        const amTaskOptions = localDb.prepare('SELECT * FROM am_task_options ORDER BY display_order').all();
        console.log(`🔧 AMタスクオプション: ${amTaskOptions.length}件`);
        for (const opt of amTaskOptions) {
            await turso.execute({
                sql: `INSERT OR REPLACE INTO am_task_options (id, name, bg_color, text_color, exclude_from_auto, display_order, is_fallback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [opt.id, opt.name, opt.bg_color, opt.text_color, opt.exclude_from_auto, opt.display_order, opt.is_fallback, opt.created_at],
            });
        }

        // --- am_assignments ---
        const amAssignments = localDb.prepare('SELECT * FROM am_assignments ORDER BY id').all();
        console.log(`✅ AMタスク割り当て: ${amAssignments.length}件`);
        for (const assign of amAssignments) {
            await turso.execute({
                sql: `INSERT OR REPLACE INTO am_assignments (id, employee_id, date, task_name, is_auto_assigned, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                args: [assign.id, assign.employee_id, assign.date, assign.task_name, assign.is_auto_assigned, assign.created_at],
            });
        }

        // --- pm_assignments ---
        const pmAssignments = localDb.prepare('SELECT * FROM pm_assignments ORDER BY id').all();
        console.log(`🌙 PMタスク割り当て: ${pmAssignments.length}件`);
        for (const assign of pmAssignments) {
            await turso.execute({
                sql: `INSERT OR REPLACE INTO pm_assignments (id, employee_id, date, created_at) VALUES (?, ?, ?, ?)`,
                args: [assign.id, assign.employee_id, assign.date, assign.created_at],
            });
        }

        console.log('\n✅ データ移行が完了しました！');
    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
        throw error;
    }
}

migrate();
