export function transitionRuntime(current = 'HEALTHY', event = { type: 'NORMAL' }) {
  if (current === 'EMERGENCY') return event.type === 'RECOVER' ? 'PAUSED' : 'EMERGENCY';
  if (current === 'PAUSED') {
    if (event.type === 'EMERGENCY') return 'EMERGENCY';
    return event.type === 'RECOVER' ? 'HEALTHY' : 'PAUSED';
  }
  if (event.type === 'EMERGENCY') return 'EMERGENCY';
  if (event.type === 'PAUSE') return 'PAUSED';
  if (event.type === 'REVIEW') return 'DEGRADED';
  if (event.type === 'WARNING') return current === 'HEALTHY' ? 'WATCH' : current;
  if (event.type === 'NORMAL' && current === 'WATCH') return 'HEALTHY';
  return current;
}
