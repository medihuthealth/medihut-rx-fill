// ═══════════════════════════════════════════════════════════
// Frontend types matching the backend API
// ═══════════════════════════════════════════════════════════

export type AiProvider = 'claude' | 'openai' | 'gemini';

export interface ProviderInfo {
  id: AiProvider;
  name: string;
  icon: string;
  iconPath?: string;
  keyPrefix: string;
  keyHint: string;
  link: string;
  linkText: string;
  models: { id: string; label: string }[];
}

export const PROVIDERS: Record<AiProvider, ProviderInfo> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    icon: '🟠',
    iconPath: '/claude_logo.svg',
    keyPrefix: 'sk-ant-',
    keyHint: 'sk-ant-api03-...',
    link: 'https://console.anthropic.com/settings/keys',
    linkText: 'console.anthropic.com →',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'claude-sonnet-4-20250514 (recommended)' },
      { id: 'claude-opus-4-20250514', label: 'claude-opus-4-20250514 (most capable)' },
      { id: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5-20251001 (fastest)' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    iconPath: '/chatgpt_logo.png',
    keyPrefix: 'sk-',
    keyHint: 'sk-proj-... or sk-...',
    link: 'https://platform.openai.com/api-keys',
    linkText: 'platform.openai.com →',
    models: [
      { id: 'gpt-4o', label: 'gpt-4o (recommended)' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini (faster & cheaper)' },
      { id: 'gpt-4-turbo', label: 'gpt-4-turbo' },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    icon: '🔵',
    iconPath: '/gemini_logo.png',
    keyPrefix: 'AIza',
    keyHint: 'AIzaSy...',
    link: 'https://aistudio.google.com/app/apikey',
    linkText: 'aistudio.google.com →',
    models: [
      { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash (recommended)' },
      { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro (most capable)' },
      { id: 'gemini-1.5-flash', label: 'gemini-1.5-flash (fastest)' },
    ],
  },
};

export interface UploadResponse {
  uploadId: string;
  fileName: string;
  fileSize: number;
  headers: string[];
  rowCount: number;
  columnCount: number;
  sampleRows: string[][];
}

export interface ColumnMapping {
  brandName: number;
  packing: number;
  batch: number;
  expiry: number;
  mrp: number;
  qty: number;
}

export interface FieldMapping {
  key: keyof ColumnMapping;
  label: string;
  hints: string[];
  required: boolean;
}

export const FIELD_MAPPINGS: FieldMapping[] = [
  { key: 'brandName', label: 'Brand / Medicine Name ★', hints: ['description', 'medicine', 'brand', 'drug', 'product', 'name', 'item'], required: true },
  { key: 'packing', label: 'Packing / Pack Size', hints: ['pack', 'packing', 'size'], required: false },
  { key: 'batch', label: 'Batch Number', hints: ['batch', 'lot'], required: false },
  { key: 'expiry', label: 'Expiry Date', hints: ['expiry', 'expir', 'exp'], required: false },
  { key: 'mrp', label: 'MRP / Price', hints: ['mrp', 'price', 'rate', 'm.r.p'], required: false },
  { key: 'qty', label: 'Quantity / Stock', hints: ['quantity', 'qty', 'stock', 'units'], required: false },
];

export interface ProgressEvent {
  type: 'progress' | 'batch_done' | 'error' | 'complete';
  batch?: number;
  totalBatches?: number;
  processed?: number;
  total?: number;
  message?: string;
  downloadId?: string;
  tokens?: number;
}

export interface LogEntry {
  id: string;
  status: 'proc' | 'ok' | 'err';
  message: string;
}

export type WizardStep = 1 | 2 | 3 | 4;

export interface AppState {
  step: WizardStep;
  provider: AiProvider;
  apiKey: string;
  model: string;
  keyValidated: boolean;
  keyStatus: { type: '' | 'ok' | 'fail' | 'checking'; message: string };
  uploadId: string | null;
  fileName: string;
  fileSize: number;
  headers: string[];
  rowCount: number;
  columnCount: number;
  columnMapping: ColumnMapping;
  batchSize: number;
  outputFileName: string;
  generating: boolean;
  progress: number;
  totalRows: number;
  processedRows: number;
  logs: LogEntry[];
  tokenUsageData: { batch: number; tokens: number }[];
  downloadId: string | null;
  resultStats: { total: number; filled: number; needReview: number } | null;
  error: string | null;
}

export const REQUIRED_COLUMNS = [
  'Medicine Name', 'Brand Name', 'Category', 'Stock', 'MRP', 'Strength', 'Manufacturer',
] as const;
