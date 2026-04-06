import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiMedicineData } from '../common/types';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts';

// Realistic token estimate per medicine (17 fields including long text like Description).
// Keeps max_tokens at 4000 for batch ≤ 8;  for larger batches the cap still applies.
const TOKENS_PER_MEDICINE = 500;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * Validate an API key by making a minimal test call
   */
  async validateKey(provider: AiProvider, apiKey: string, model: string): Promise<{ valid: boolean; message: string }> {
    try {
      switch (provider) {
        case 'claude':
          return await this.validateClaude(apiKey, model);
        case 'openai':
          return await this.validateOpenAI(apiKey, model);
        case 'gemini':
          return await this.validateGemini(apiKey, model);
        default:
          return { valid: false, message: `Unknown provider: ${provider}` };
      }
    } catch (error: any) {
      this.logger.error(`Key validation failed for ${provider}: ${error.message}`);
      return { valid: false, message: error.message || 'Validation failed' };
    }
  }

  /**
   * Call the AI provider with a list of medicines and get structured data back.
   * Retries up to 3 times on rate-limit (429) errors with exponential backoff.
   */
  async callProvider(
    provider: AiProvider,
    apiKey: string,
    model: string,
    medicineList: string,
    batchSize = 10,
  ): Promise<{ data: AiMedicineData[]; tokens: number }> {
    const maxTokens = Math.min(4000, Math.max(1024, batchSize * TOKENS_PER_MEDICINE));
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        switch (provider) {
          case 'claude':
            return await this.callClaude(apiKey, model, medicineList, maxTokens);
          case 'openai':
            return await this.callOpenAI(apiKey, model, medicineList, maxTokens);
          case 'gemini':
            return await this.callGemini(apiKey, model, medicineList, maxTokens);
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
      } catch (err: any) {
        const is429 =
          err?.message?.includes('rate limit') ||
          err?.message?.includes('429') ||
          err?.message?.includes('output tokens per minute');

        if (is429 && attempt < maxRetries) {
          const waitMs = attempt * 30_000; // 30s, 60s backoff
          this.logger.warn(`Rate limit hit — waiting ${waitMs / 1000}s before retry ${attempt + 1}/${maxRetries}`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Max retries exceeded');
  }

  // ── Claude ──────────────────────────────────────────────
  private async validateClaude(apiKey: string, model: string): Promise<{ valid: boolean; message: string }> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'say ok' }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    return { valid: true, message: 'Claude API key is valid' };
  }

  private async callClaude(
    apiKey: string,
    model: string,
    medicineList: string,
    maxTokens: number,
  ): Promise<{ data: AiMedicineData[]; tokens: number }> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: USER_PROMPT_TEMPLATE(medicineList) }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    const parsedData = this.parseAiResponse(text);
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    return { data: parsedData, tokens };
  }

  // ── OpenAI ──────────────────────────────────────────────
  private async validateOpenAI(apiKey: string, model: string): Promise<{ valid: boolean; message: string }> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'say ok' }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    return { valid: true, message: 'OpenAI API key is valid' };
  }

  private async callOpenAI(
    apiKey: string,
    model: string,
    medicineList: string,
    maxTokens: number,
  ): Promise<{ data: AiMedicineData[]; tokens: number }> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + '\nWrap the array in {"data": [...]}' },
          { role: 'user', content: USER_PROMPT_TEMPLATE(medicineList) },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '[]';
    const tokens = data.usage?.total_tokens || 0;

    try {
      const parsed = JSON.parse(text);
      const parsedData = Array.isArray(parsed) ? parsed : (parsed.data || []);
      return { data: parsedData, tokens };
    } catch {
      return { data: this.parseAiResponse(text), tokens };
    }
  }

  // ── Gemini ──────────────────────────────────────────────
  private async validateGemini(apiKey: string, model: string): Promise<{ valid: boolean; message: string }> {
    const modelName = model || 'gemini-1.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'say ok' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    return { valid: true, message: 'Gemini API key is valid' };
  }

  private async callGemini(
    apiKey: string,
    model: string,
    medicineList: string,
    maxTokens: number,
  ): Promise<{ data: AiMedicineData[]; tokens: number }> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT + '\n\n' + USER_PROMPT_TEMPLATE(medicineList),
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const tokens = data.usageMetadata?.totalTokenCount || 0;
    return { data: this.parseAiResponse(text), tokens };
  }

  // ── Response parsing ────────────────────────────────────
  private parseAiResponse(text: string): AiMedicineData[] {
    // Strip markdown code fences if present
    let cleaned = text
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // Find the start of the JSON array
    const arrayStart = cleaned.indexOf('[');
    if (arrayStart > 0) cleaned = cleaned.slice(arrayStart);

    // ── Tier 1: perfect full parse ────────────────────────────
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }

    // ── Tier 2: truncated array — try appending ] ─────────────
    const lastClose = cleaned.lastIndexOf('}');
    if (lastClose > 0) {
      try {
        const candidate = cleaned.slice(0, lastClose + 1) + ']';
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.logger.warn(`Truncated JSON recovered: ${parsed.length} objects`);
          return parsed;
        }
      } catch { /* fall through */ }
    }

    // ── Tier 3: object-level extraction ──────────────────────
    // Walk character-by-character and extract each complete {...} block.
    const results: AiMedicineData[] = [];
    let depth = 0;
    let objStart = -1;

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '{') {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && objStart >= 0) {
          try {
            const obj = JSON.parse(cleaned.slice(objStart, i + 1));
            results.push(obj as AiMedicineData);
          } catch { /* skip malformed object */ }
          objStart = -1;
        }
      }
    }

    if (results.length > 0) {
      this.logger.warn(`Partial JSON extraction: salvaged ${results.length} objects`);
      return results;
    }

    this.logger.error(`Failed to parse AI response: ${cleaned.slice(0, 200)}`);
    throw new Error('Failed to parse AI response as JSON');
  }
}
