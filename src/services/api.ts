import { ProjectFile, FileScanResult, QuotaStats, AskSource } from '../types/index.js';

export interface AskStreamCallbacks {
  onChunk: (text: string) => void;
  onStatus?: (status: string) => void;
  onSources?: (sources: AskSource[]) => void;
  onError: (error: string) => void;
  onDone: (data: { searchedWeb?: boolean; sources?: AskSource[] }) => void;
}

export async function askQuestionStream(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  enableSearch: boolean,
  callbacks: AskStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, enableSearch }),
      signal,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Request failed with status ${res.status}`);
    }

    if (!res.body) {
      throw new Error('Response body missing');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payloadStr = trimmed.slice(6);
        try {
          const payload = JSON.parse(payloadStr);
          if (payload.type === 'chunk' && payload.text) {
            callbacks.onChunk(payload.text);
          } else if (payload.type === 'status' && payload.message) {
            callbacks.onStatus?.(payload.message);
          } else if (payload.type === 'search_completed' && payload.sources) {
            callbacks.onSources?.(payload.sources);
          } else if (payload.type === 'done') {
            callbacks.onDone({ searchedWeb: payload.searchedWeb, sources: payload.sources });
          } else if (payload.type === 'error') {
            callbacks.onError(payload.error || 'Stream error');
          }
        } catch {
          // ignore chunk parse error
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      callbacks.onDone({});
      return;
    }
    callbacks.onError(err.message || 'Network error communicating with Ask AI');
  }
}

export async function generateProject(params: {
  prompt: string;
  currentFiles?: ProjectFile[];
  image?: { base64: string; mimeType?: string };
  settings?: { model?: string; temperature?: number; maxTokens?: number; systemInstruction?: string };
}): Promise<{ files: ProjectFile[]; summary: string; executionMs?: number }> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Generation failed');
  }

  return {
    files: data.files,
    summary: data.summary,
    executionMs: data.executionMs,
  };
}

export async function scanProjectFiles(files: ProjectFile[]): Promise<{
  results: FileScanResult[];
  disclaimer: string;
  methodologyUrl: string;
}> {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Scan analysis failed');
  }

  return data;
}

export async function fetchHealth(): Promise<any> {
  const res = await fetch('/api/health');
  return res.json();
}

export async function fetchQuotaStats(): Promise<QuotaStats> {
  const res = await fetch('/api/stats');
  return res.json();
}

export async function deployToVercel(params: {
  projectName: string;
  files: ProjectFile[];
  vercelToken?: string;
}): Promise<any> {
  const res = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}
