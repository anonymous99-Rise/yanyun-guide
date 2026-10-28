// Postgres 连接（Supabase pooler）。延迟初始化，避免构建早期无环境变量时崩溃。
import postgres from "postgres";

let _sql: postgres.Sql | null = null;

export function getDb<TTypes extends Record<string, unknown> = Record<string, unknown>>(): postgres.Sql<TTypes> {
  if (!_sql) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("缺少 POSTGRES_URL（vercel env pull 后重试）");
    _sql = postgres(url, { max: 3, prepare: false, idle_timeout: 20 });
  }
  return _sql as postgres.Sql<TTypes>;
}
