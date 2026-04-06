// ═══════════════════════════════════════════════════════════
// Backend API client
// ═══════════════════════════════════════════════════════════

import { AiProvider, UploadResponse, ProgressEvent, ColumnMapping } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Validate an AI provider API key
 */
export async function validateApiKey(
  provider: AiProvider,
  apiKey: string,
  model: string,
): Promise<{ valid: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/ai/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, model }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `Validation failed (${res.status})`);
  }

  return res.json();
}

/**
 * Upload an Excel/CSV file for parsing
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/excel/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `Upload failed (${res.status})`);
  }

  return res.json();
}

/**
 * Start the generation process and stream progress via SSE
 */
export async function startGeneration(
  params: {
    provider: AiProvider;
    apiKey: string;
    model: string;
    batchSize: number;
    outputFileName: string;
    uploadId: string;
    columnMapping: ColumnMapping;
  },
  onEvent: (event: ProgressEvent) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/generate/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `Generation failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const event: ProgressEvent = JSON.parse(data);
          onEvent(event);
        } catch {
          // skip unparseable lines
        }
      }
    }
  }
}

/**
 * Get the download URL for a generated file
 */
export function getDownloadUrl(downloadId: string): string {
  return `${API_BASE}/api/excel/download/${downloadId}`;
}

/**
 * Pause the generation process
 */
export async function pauseGeneration(uploadId: string): Promise<void> {
  await fetch(`${API_BASE}/api/generate/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId }),
  });
}

/**
 * Resume the generation process
 */
export async function resumeGeneration(uploadId: string): Promise<void> {
  await fetch(`${API_BASE}/api/generate/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId }),
  });
}
