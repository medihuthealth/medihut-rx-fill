'use client';

import React, { useState, useEffect } from 'react';
import { AiProvider, PROVIDERS } from '@/lib/types';
import { validateApiKey } from '@/lib/api';

interface ProviderSelectorProps {
  provider: AiProvider;
  apiKey: string;
  model: string;
  keyValidated: boolean;
  keyStatus: { type: '' | 'ok' | 'fail' | 'checking'; message: string };
  onProviderChange: (provider: AiProvider) => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onValidated: (valid: boolean, message: string) => void;
  onKeyStatusChange: (status: { type: '' | 'ok' | 'fail' | 'checking'; message: string }) => void;
}

export default function ProviderSelector({
  provider,
  apiKey,
  model,
  keyValidated,
  keyStatus,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onValidated,
  onKeyStatusChange,
}: ProviderSelectorProps) {
  const [vbtnState, setVbtnState] = useState<'default' | 'loading' | 'ok' | 'fail'>('default');
  const cfg = PROVIDERS[provider];

  // Load saved key from localStorage on mount and provider change
  useEffect(() => {
    const savedKey = localStorage.getItem(`rxfill_${provider}_key`) || '';
    if (savedKey) {
      onApiKeyChange(savedKey);
      if (savedKey.startsWith(cfg.keyPrefix)) {
        onKeyStatusChange({ type: '', message: 'Key loaded from browser. Click Validate to confirm.' });
      }
    } else {
      onApiKeyChange('');
      onKeyStatusChange({ type: '', message: `Enter your ${cfg.name} API key, then click Validate.` });
    }
    setVbtnState('default');
    onValidated(false, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleKeyChange = (value: string) => {
    onApiKeyChange(value);
    onValidated(false, '');
    setVbtnState('default');

    if (!value) {
      onKeyStatusChange({ type: '', message: 'Enter your API key above.' });
    } else if (value.startsWith(cfg.keyPrefix)) {
      onKeyStatusChange({ type: '', message: 'Key format looks correct. Click Validate to test.' });
    } else {
      onKeyStatusChange({ type: 'fail', message: `${cfg.name} keys start with "${cfg.keyPrefix}"` });
    }
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      onKeyStatusChange({ type: 'fail', message: 'Enter an API key first.' });
      return;
    }

    setVbtnState('loading');
    onKeyStatusChange({ type: 'checking', message: 'Testing key with a live API call...' });

    try {
      await validateApiKey(provider, apiKey.trim(), model);
      localStorage.setItem(`rxfill_${provider}_key`, apiKey.trim());
      setVbtnState('ok');
      onValidated(true, `✓ ${cfg.name} key is valid and saved.`);
      onKeyStatusChange({ type: 'ok', message: `✓ ${cfg.name} key is valid and saved in browser.` });
    } catch (err: any) {
      setVbtnState('fail');
      onValidated(false, err.message);
      onKeyStatusChange({ type: 'fail', message: `✗ ${err.message || 'Validation failed'}` });
    }
  };

  const getKeyInputClass = () => {
    if (!apiKey) return 'key-input';
    if (keyValidated || apiKey.startsWith(cfg.keyPrefix)) return 'key-input valid';
    return 'key-input invalid';
  };

  const getVbtnClass = () => {
    const map = { default: '', loading: 'validating', ok: 'v-ok', fail: 'v-fail' };
    return `validate-btn ${map[vbtnState]}`;
  };

  const vbtnIcon = { default: '🔍', loading: '⏳', ok: '✅', fail: '❌' }[vbtnState];
  const vbtnText = { default: 'Validate', loading: 'Testing…', ok: 'Valid!', fail: 'Failed' }[vbtnState];

  return (
    <div className="panel panel--accent">
      <div className="panel-title">AI Provider &amp; API Key</div>

      {/* Provider Tabs */}
      <div className="provider-tabs">
        {(['claude', 'openai', 'gemini'] as AiProvider[]).map((p) => {
          const info = PROVIDERS[p];
          const isActive = provider === p;
          return (
            <div
              key={p}
              className={`provider-tab ${isActive ? `active-${p}` : ''}`}
              onClick={() => onProviderChange(p)}
            >
              <div className="provider-tab-check">{isActive ? '✓' : ''}</div>
              <div className="provider-tab-icon">{info.icon}</div>
              <div className="provider-tab-name">{info.name}</div>
              <div className="provider-tab-sub">{p === 'openai' ? 'OpenAI' : p === 'claude' ? 'Anthropic' : 'Google'}</div>
            </div>
          );
        })}
      </div>

      {/* Key Input */}
      <div className="key-area">
        <div className="key-input-wrap">
          <div className="key-label">
            <span>{cfg.name} API Key</span>
            <a href={cfg.link} target="_blank" rel="noopener noreferrer">
              {cfg.linkText}
            </a>
          </div>
          <input
            type="password"
            className={getKeyInputClass()}
            placeholder={cfg.keyHint}
            value={apiKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className={getVbtnClass()} onClick={handleValidate}>
          <span className="validate-btn-icon">{vbtnIcon}</span>
          <span className="validate-btn-text">{vbtnText}</span>
        </button>
      </div>

      {/* Model selector */}
      <div className="model-row">
        <select
          className="model-select"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
        >
          {cfg.models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <span className="model-note">Switch model if needed</span>
      </div>

      {/* Status */}
      <div className={`key-status ${keyStatus.type}`}>
        <div className="status-dot" />
        <span>{keyStatus.message}</span>
      </div>
    </div>
  );
}
