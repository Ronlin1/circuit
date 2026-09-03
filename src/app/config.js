export function resolveRuntimeConfig(env = process.env) {
  const port = Number(env.CIRCUIT_PORT ?? env.PORT ?? 3000);
  const mode = String(env.CIRCUIT_MODE ?? 'simulation').toLowerCase();
  const dbPath = env.CIRCUIT_DB_PATH ?? (env.VERCEL ? '/tmp/circuit.db' : 'circuit.db');
  return Object.freeze({ port, mode, dbPath });
}
