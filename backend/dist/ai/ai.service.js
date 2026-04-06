"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const prompts_1 = require("./prompts");
let AiService = AiService_1 = class AiService {
    logger = new common_1.Logger(AiService_1.name);
    async validateKey(provider, apiKey, model) {
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
        }
        catch (error) {
            this.logger.error(`Key validation failed for ${provider}: ${error.message}`);
            return { valid: false, message: error.message || 'Validation failed' };
        }
    }
    async callProvider(provider, apiKey, model, medicineList) {
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
    async validateClaude(apiKey, model) {
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
    async callClaude(apiKey, model, medicineList) {
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
                system: prompts_1.SYSTEM_PROMPT,
                messages: [{ role: 'user', content: (0, prompts_1.USER_PROMPT_TEMPLATE)(medicineList) }],
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const text = (data.content || [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('');
        return this.parseAiResponse(text);
    }
    async validateOpenAI(apiKey, model) {
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
    async callOpenAI(apiKey, model, medicineList) {
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
                    { role: 'system', content: prompts_1.SYSTEM_PROMPT + '\nWrap the array in {"data": [...]}' },
                    { role: 'user', content: (0, prompts_1.USER_PROMPT_TEMPLATE)(medicineList) },
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
        }
        catch {
            return this.parseAiResponse(text);
        }
    }
    async validateGemini(apiKey, model) {
        const modelName = model || 'gemini-1.5-flash';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'say ok' }] }],
                generationConfig: { maxOutputTokens: 5 },
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        return { valid: true, message: 'Gemini API key is valid' };
    }
    async callGemini(apiKey, model, medicineList) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompts_1.SYSTEM_PROMPT + '\n\n' + (0, prompts_1.USER_PROMPT_TEMPLATE)(medicineList),
                            },
                        ],
                    },
                ],
                generationConfig: { maxOutputTokens: 8000, temperature: 0.1 },
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        return this.parseAiResponse(text);
    }
    parseAiResponse(text) {
        let cleaned = text
            .replace(/^```[\w]*\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
        const start = cleaned.indexOf('[');
        if (start > 0) {
            cleaned = cleaned.slice(start);
        }
        const end = cleaned.lastIndexOf(']');
        if (end > 0 && end < cleaned.length - 1) {
            cleaned = cleaned.slice(0, end + 1);
        }
        try {
            return JSON.parse(cleaned);
        }
        catch (error) {
            this.logger.error(`Failed to parse AI response: ${cleaned.slice(0, 200)}`);
            throw new Error('Failed to parse AI response as JSON');
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)()
], AiService);
//# sourceMappingURL=ai.service.js.map