import { createAppServices } from '../src/app/services.js';
import { createHttpServer } from '../src/server/http.js';

const services = createAppServices({ dbPath: ':memory:', mode: 'simulation', now: '2026-09-03T12:01:00.000Z' });
const server = createHttpServer(services);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  assert(response.ok, `${url} returned HTTP ${response.status}`);
  return body;
}

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const health = await json(`${base}/api/health`);
  assert(health.data.status === 'ready', 'health endpoint did not report ready');
  assert(health.data.mode === 'SIMULATION', 'smoke server must remain in simulation');

  const scenario = await json(`${base}/api/scenarios/oversize-order/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  assert(scenario.data.trace.decision === 'BLOCK', 'oversize scenario must BLOCK');
  assert(scenario.data.trace.reasonCodes.includes('ORDER_CAP_EXCEEDED'), 'oversize scenario missing reason code');

  const mcp = await json(`${base}/mcp/circuit`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/event-stream',
      'mcp-protocol-version': '2026-07-28',
      'mcp-method': 'tools/list'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: { _meta: { 'io.modelcontextprotocol/clientInfo': { name: 'circuit-smoke', version: '1.0.0' } } }
    })
  });
  const names = mcp.result.tools.map((tool) => tool.name).sort();
  assert(JSON.stringify(names) === JSON.stringify(['circuit_evaluate_intent','circuit_status','circuit_trace_briefing']), 'MCP tool surface drifted');

  const traces = await json(`${base}/api/traces`);
  assert(traces.data.length >= 1, 'smoke flow did not record a trace');

  console.log('HTTP smoke: health ready; oversize BLOCK; MCP 3-tool advisory surface; trace recorded');
} finally {
  await new Promise((resolve) => server.close(resolve));
  services.close();
}
