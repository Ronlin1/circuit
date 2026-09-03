import { createAppServices } from './app/services.js';
import { resolveRuntimeConfig } from './app/config.js';
import { createHttpServer } from './server/http.js';

const config = resolveRuntimeConfig(process.env);
const services = createAppServices({ dbPath: config.dbPath, mode: config.mode });
const server = createHttpServer(services);
server.listen(config.port, () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : config.port;
  console.log(`CIRCUIT listening on http://localhost:${port} [${services.mode}]`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => {
    services.close();
    process.exit(0);
  }));
}
