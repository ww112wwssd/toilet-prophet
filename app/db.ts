type RuntimeEnv = { DB?: D1Database };

export function database(): D1Database {
  const db = ((globalThis as { __TP_ENV?: RuntimeEnv }).__TP_ENV ?? {}).DB;
  if (!db) throw new Error("Database binding is not configured.");
  return db;
}

let initialized: Promise<void> | undefined;

export function ensureSchema(): Promise<void> {
  if (initialized) return initialized;
  const db = database();
  initialized = db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, avatar_url TEXT NOT NULL DEFAULT 'default', points INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, episode_no INTEGER NOT NULL UNIQUE, title TEXT NOT NULL, clue TEXT NOT NULL DEFAULT '', correct_door INTEGER, voting_ends_at TEXT NOT NULL, reveal_at TEXT, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, round_id TEXT NOT NULL, user_id TEXT NOT NULL, door INTEGER NOT NULL, result TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(round_id, user_id))"),
    db.prepare("CREATE TABLE IF NOT EXISTS prizes (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', rarity TEXT NOT NULL DEFAULT 'common', stock INTEGER NOT NULL DEFAULT 0, weight INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS awards (id TEXT PRIMARY KEY, round_id TEXT NOT NULL, user_id TEXT NOT NULL, prize_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'stored', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  ]).then(() => undefined);
  return initialized;
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
