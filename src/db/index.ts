import * as schema from "./schema";

// Turso (本番) or ローカルSQLite (開発) を自動切り替え
function createDb() {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl && tursoToken) {
        // Turso (libsql) 接続
        const { createClient } = require("@libsql/client");
        const { drizzle } = require("drizzle-orm/libsql");
        const client = createClient({
            url: tursoUrl,
            authToken: tursoToken,
        });
        return drizzle(client, { schema });
    } else {
        // ローカルSQLite フォールバック
        const Database = require("better-sqlite3");
        const { drizzle } = require("drizzle-orm/better-sqlite3");
        const sqlite = new Database("local.db");
        return drizzle(sqlite, { schema });
    }
}

export const db = createDb();
