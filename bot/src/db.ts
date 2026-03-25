import { Database } from "bun:sqlite";
import path from "node:path";

const DB_PATH = path.join(import.meta.dir, "..", "seen.db");

const db = new Database(DB_PATH, { create: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS seen_articles (
    url     TEXT PRIMARY KEY,
    seen_at INTEGER NOT NULL
  )
`);

const stmtHas = db.query<{ url: string }, [string]>(
  "SELECT url FROM seen_articles WHERE url = ?"
);
const stmtInsert = db.query(
  "INSERT OR IGNORE INTO seen_articles (url, seen_at) VALUES (?, ?)"
);

export function hasSeen(url: string): boolean {
  return stmtHas.get(url) !== null;
}

export function markSeen(url: string): void {
  stmtInsert.run(url, Date.now());
}
