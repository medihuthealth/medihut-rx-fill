'use client';

import React, { useReducer, useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import StepIndicator from '@/components/StepIndicator';
import ProviderSelector from '@/components/ProviderSelector';
import FileUpload from '@/components/FileUpload';
import ColumnMappingPanel from '@/components/ColumnMapping';
import Settings from '@/components/Settings';
import ProgressPanel from '@/components/ProgressPanel';
import ResultsPanel from '@/components/ResultsPanel';
import { startGeneration } from '@/lib/api';
import {
  AppState,
  AiProvider,
  ColumnMapping,
  WizardStep,
  FIELD_MAPPINGS,
  PROVIDERS,
  UploadResponse,
  ProgressEvent,
  LogEntry,
} from '@/lib/types';

// ═══════════════════════════════════════════════════════════
// State management with useReducer
// ═══════════════════════════════════════════════════════════

type Action =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_PROVIDER'; provider: AiProvider }
  | { type: 'SET_API_KEY'; key: string }
  | { type: 'SET_MODEL'; model: string }
  | { type: 'SET_KEY_VALIDATED'; valid: boolean; message: string }
  | { type: 'SET_KEY_STATUS'; status: { type: '' | 'ok' | 'fail' | 'checking'; message: string } }
  | { type: 'FILE_UPLOADED'; data: UploadResponse; mapping: ColumnMapping }
  | { type: 'RESET_FILE' }
  | { type: 'SET_MAPPING'; mapping: ColumnMapping }
  | { type: 'SET_BATCH_SIZE'; size: number }
  | { type: 'SET_OUTPUT_NAME'; name: string }
  | { type: 'START_GENERATING' }
  | { type: 'PROGRESS_EVENT'; event: ProgressEvent }
  | { type: 'GENERATION_COMPLETE'; downloadId: string; filled: number; total: number }
  | { type: 'GENERATION_ERROR'; message: string }
  | { type: 'SET_ERROR'; message: string | null };

const initialState: AppState = {
  step: 1,
  provider: 'claude',
  apiKey: '',
  model: PROVIDERS.claude.models[0].id,
  keyValidated: false,
  keyStatus: { type: '', message: 'Enter your API key, then click Validate.' },
  uploadId: null,
  fileName: '',
  fileSize: 0,
  headers: [],
  rowCount: 0,
  columnCount: 0,
  columnMapping: { brandName: -1, packing: -1, batch: -1, expiry: -1, mrp: -1, qty: -1 },
  batchSize: 10,
  outputFileName: 'medicine_catalog_complete.xlsx',
  generating: false,
  progress: 0,
  totalRows: 0,
  processedRows: 0,
  logs: [],
  tokenUsageData: [],
  downloadId: null,
  resultStats: null,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_PROVIDER':
      return {
        ...state,
        provider: action.provider,
        model: PROVIDERS[action.provider].models[0].id,
        keyValidated: false,
        keyStatus: { type: '', message: `Enter your ${PROVIDERS[action.provider].name} API key, then click Validate.` },
      };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.key };
    case 'SET_MODEL':
      return { ...state, model: action.model };
    case 'SET_KEY_VALIDATED':
      return { ...state, keyValidated: action.valid };
    case 'SET_KEY_STATUS':
      return { ...state, keyStatus: action.status };
    case 'FILE_UPLOADED':
      return {
        ...state,
        uploadId: action.data.uploadId,
        fileName: action.data.fileName,
        fileSize: action.data.fileSize,
        headers: action.data.headers,
        rowCount: action.data.rowCount,
        columnCount: action.data.columnCount,
        columnMapping: action.mapping,
        step: 3,
        error: null,
      };
    case 'RESET_FILE':
      return {
        ...state,
        uploadId: null,
        fileName: '',
        fileSize: 0,
        headers: [],
        rowCount: 0,
        columnCount: 0,
        columnMapping: { brandName: -1, packing: -1, batch: -1, expiry: -1, mrp: -1, qty: -1 },
        step: 1,
        generating: false,
        logs: [],
        tokenUsageData: [],
        downloadId: null,
        resultStats: null,
        error: null,
      };
    case 'SET_MAPPING':
      return { ...state, columnMapping: action.mapping };
    case 'SET_BATCH_SIZE':
      return { ...state, batchSize: action.size };
    case 'SET_OUTPUT_NAME':
      return { ...state, outputFileName: action.name };
    case 'START_GENERATING':
      return {
        ...state,
        step: 4,
        generating: true,
        logs: [],
        tokenUsageData: [],
        processedRows: 0,
        totalRows: 0,
        downloadId: null,
        resultStats: null,
        error: null,
      };
    case 'PROGRESS_EVENT': {
      const event = action.event;
      const newLogs = [...state.logs];
      const logId = `batch-${event.batch ?? 'general'}`;

      let newTokenUsageData = state.tokenUsageData;

      if (event.type === 'progress') {
        const existingIdx = newLogs.findIndex((l) => l.id === logId);
        const entry: LogEntry = { id: logId, status: 'proc', message: event.message || '' };
        if (existingIdx >= 0) newLogs[existingIdx] = entry;
        else newLogs.push(entry);
      } else if (event.type === 'batch_done') {
        const existingIdx = newLogs.findIndex((l) => l.id === logId);
        const entry: LogEntry = { id: logId, status: 'ok', message: event.message || '' };
        if (existingIdx >= 0) newLogs[existingIdx] = entry;
        else newLogs.push(entry);
        
        if (event.batch !== undefined && event.tokens !== undefined) {
          newTokenUsageData = [...state.tokenUsageData, { batch: event.batch, tokens: event.tokens }];
        }
      } else if (event.type === 'error' && event.batch) {
        const existingIdx = newLogs.findIndex((l) => l.id === logId);
        const entry: LogEntry = { id: logId, status: 'err', message: event.message || '' };
        if (existingIdx >= 0) newLogs[existingIdx] = entry;
        else newLogs.push(entry);
      }

      return {
        ...state,
        logs: newLogs,
        tokenUsageData: newTokenUsageData,
        processedRows: event.processed ?? state.processedRows,
        totalRows: event.total ?? state.totalRows,
      };
    }
    case 'GENERATION_COMPLETE':
      return {
        ...state,
        generating: false,
        downloadId: action.downloadId,
        resultStats: {
          total: action.total,
          filled: action.filled,
          needReview: action.total - action.filled,
        },
      };
    case 'GENERATION_ERROR':
      return { ...state, generating: false, error: action.message };
    case 'SET_ERROR':
      return { ...state, error: action.message };
    default:
      return state;
  }
}

// ── Auto-detect column mapping ────────────────────────────
function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { brandName: -1, packing: -1, batch: -1, expiry: -1, mrp: -1, qty: -1 };
  for (const field of FIELD_MAPPINGS) {
    const idx = headers.findIndex((h) =>
      field.hints.some((hint) => h.toLowerCase().includes(hint)),
    );
    if (idx >= 0) mapping[field.key] = idx;
  }
  return mapping;
}

// ═══════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════
export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Theme state ────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('rxfill_theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('rxfill_theme', next);
      return next;
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────
  const handleUploadComplete = useCallback((data: UploadResponse) => {
    const mapping = autoDetectMapping(data.headers);
    dispatch({ type: 'FILE_UPLOADED', data, mapping });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (state.columnMapping.brandName < 0) {
      dispatch({ type: 'SET_ERROR', message: 'Map the Brand / Medicine Name column first.' });
      return;
    }
    if (!state.apiKey.trim()) {
      dispatch({ type: 'SET_ERROR', message: 'Enter your API key in the AI Provider section above.' });
      return;
    }
    if (!state.uploadId) {
      dispatch({ type: 'SET_ERROR', message: 'Upload a file first.' });
      return;
    }

    dispatch({ type: 'START_GENERATING' });

    try {
      await startGeneration(
        {
          provider: state.provider,
          apiKey: state.apiKey.trim(),
          model: state.model,
          batchSize: state.batchSize,
          outputFileName: state.outputFileName,
          uploadId: state.uploadId,
          columnMapping: state.columnMapping,
        },
        (event: ProgressEvent) => {
          dispatch({ type: 'PROGRESS_EVENT', event });

          if (event.type === 'complete' && event.downloadId) {
            const match = event.message?.match(/(\d+)\/(\d+)/);
            const filled = match ? parseInt(match[1]) : event.processed || 0;
            const total = match ? parseInt(match[2]) : event.total || 0;
            dispatch({ type: 'GENERATION_COMPLETE', downloadId: event.downloadId, filled, total });
          }

          if (event.type === 'error' && !event.batch) {
            dispatch({ type: 'GENERATION_ERROR', message: event.message || 'Generation failed' });
          }
        },
      );
    } catch (err: any) {
      dispatch({ type: 'GENERATION_ERROR', message: err.message || 'Generation failed' });
    }
  }, [state.columnMapping, state.apiKey, state.uploadId, state.provider, state.model, state.batchSize, state.outputFileName]);

  return (
    <div className="wrap">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {/* AI Provider Panel */}
      <ProviderSelector
        provider={state.provider}
        apiKey={state.apiKey}
        model={state.model}
        keyValidated={state.keyValidated}
        keyStatus={state.keyStatus}
        onProviderChange={(p) => dispatch({ type: 'SET_PROVIDER', provider: p })}
        onApiKeyChange={(k) => dispatch({ type: 'SET_API_KEY', key: k })}
        onModelChange={(m) => dispatch({ type: 'SET_MODEL', model: m })}
        onValidated={(valid, message) => dispatch({ type: 'SET_KEY_VALIDATED', valid, message })}
        onKeyStatusChange={(s) => dispatch({ type: 'SET_KEY_STATUS', status: s })}
      />

      {/* Step Indicator */}
      <StepIndicator currentStep={state.step} />

      {/* Step 1: File Upload */}
      <FileUpload
        onUploadComplete={handleUploadComplete}
        onReset={() => dispatch({ type: 'RESET_FILE' })}
        uploadId={state.uploadId}
        fileName={state.fileName}
        fileSize={state.fileSize}
        rowCount={state.rowCount}
        columnCount={state.columnCount}
      />

      {/* Step 2: Column Mapping */}
      {state.uploadId && (
        <ColumnMappingPanel
          headers={state.headers}
          mapping={state.columnMapping}
          onMappingChange={(m) => dispatch({ type: 'SET_MAPPING', mapping: m })}
        />
      )}

      {/* Step 3: Settings */}
      {state.uploadId && (
        <Settings
          batchSize={state.batchSize}
          outputFileName={state.outputFileName}
          onBatchSizeChange={(s) => dispatch({ type: 'SET_BATCH_SIZE', size: s })}
          onOutputFileNameChange={(n) => dispatch({ type: 'SET_OUTPUT_NAME', name: n })}
        />
      )}

      {/* Error Message */}
      {state.error && <div className="error-msg">⚠ {state.error}</div>}

      {/* Generate Button */}
      {state.uploadId && (
        <button
          className="gen-btn"
          disabled={state.generating}
          onClick={handleGenerate}
        >
          {state.generating
            ? '⏳ Generating... Please wait'
            : '⚡ Generate Complete Catalog — 30 Columns, Exact Format'}
        </button>
      )}

      {/* Step 4: Progress */}
      {(state.generating || state.logs.length > 0) && (
        <ProgressPanel
          processedRows={state.processedRows}
          totalRows={state.totalRows}
          logs={state.logs}
          tokenUsageData={state.tokenUsageData}
        />
      )}

      {/* Results */}
      {state.downloadId && state.resultStats && (
        <ResultsPanel
          provider={state.provider}
          totalRows={state.resultStats.total}
          filledCount={state.resultStats.filled}
          needReview={state.resultStats.needReview}
          downloadId={state.downloadId}
        />
      )}
    </div>
  );
}
