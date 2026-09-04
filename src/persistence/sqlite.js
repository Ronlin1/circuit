import { DatabaseSync } from 'node:sqlite';

export function createSqlitePersistence(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS mandates (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_runtime (
      agent_id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trace_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT UNIQUE NOT NULL,
      payload TEXT NOT NULL,
      current_hash TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS execution_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  const insertTrace = db.prepare('INSERT INTO trace_events(trace_id,payload,current_hash,previous_hash,timestamp) VALUES(?,?,?,?,?)');
  const listTraces = db.prepare('SELECT payload FROM trace_events ORDER BY seq ASC');
  const getTrace = db.prepare('SELECT payload FROM trace_events WHERE trace_id = ?');
  const lastTrace = db.prepare('SELECT payload FROM trace_events ORDER BY seq DESC LIMIT 1');

  return {
    db,
    insertTrace(event) { insertTrace.run(event.traceId, JSON.stringify(event), event.currentHash, event.previousHash, event.timestamp); return event; },
    listTraces() { return listTraces.all().map((row) => JSON.parse(row.payload)); },
    getTrace(traceId) { const row = getTrace.get(traceId); return row ? JSON.parse(row.payload) : null; },
    lastTrace() { const row = lastTrace.get(); return row ? JSON.parse(row.payload) : null; },
    close() { db.close(); }
  };
}
