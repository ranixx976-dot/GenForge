export interface LogEvent {
  requestId: string;
  mode: 'ask' | 'build' | 'scan' | 'deploy' | 'system';
  latencyMs?: number;
  tokenCounts?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  status: 'start' | 'success' | 'error' | 'rate_limited';
  error?: string;
  ipHash?: string;
}

export function logEvent(event: LogEvent): void {
  const timestamp = new Date().toISOString();
  // Safe structured log without raw user prompts or confidential code
  const entry = {
    timestamp,
    ...event,
  };
  if (event.status === 'error') {
    console.error(`[GenForge LOG ERROR] ${JSON.stringify(entry)}`);
  } else {
    console.log(`[GenForge LOG] ${JSON.stringify(entry)}`);
  }
}
