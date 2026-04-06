import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiMedicineData } from '../common/types';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts';

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
   * Call the AI provider with a list of medicines and get structured data back
   */
  async callProvider(
    provider: AiProvider,
    apiKey: string,
    model: string,
    medicineList: string,
  ): Promise<AiMedicineData[]> {
    switch (provider) {
      case 'claude':
        return this.callClaude(apiKey, model, medicineList);
      case 'openai':
        return this.callOpenAI(apiKey, model, medicineList);
      case 'gemini':
        return this.callGemini(apiKey, model, medicineList);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
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

  private async callClaude(apiKey: string, model: string, medicineList: string): Promise<AiMedicineData[]> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
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

    return this.parseAiResponse(text);
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

  private async callOpenAI(apiKey: string, model: string, medicineList: string): Promise<AiMedicineData[]> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
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

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : (parsed.data || []);
    } catch {
      return this.parseAiResponse(text);
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

  private async callGemini(apiKey: string, model: string, medicineList: string): Promise<AiMedicineData[]> {
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
          generationConfig: { maxOutputTokens: 8000, temperature: 0.1 },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    return this.parseAiResponse(text);
  }

  // ── Response parsing ────────────────────────────────────
  private parseAiResponse(text: string): AiMedicineData[] {
    // Strip markdown code fences if present
    let cleaned = text
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // Find the start of the JSON array
    const start = cleaned.indexOf('[');
    if (start > 0) {
      cleaned = cleaned.slice(start);
    }

    // Find the end of the JSON array
    const end = cleaned.lastIndexOf(']');
    if (end > 0 && end < cleaned.length - 1) {
      cleaned = cleaned.slice(0, end + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${cleaned.slice(0, 200)}`);
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}
