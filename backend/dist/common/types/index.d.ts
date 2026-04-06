export type AiProvider = 'claude' | 'openai' | 'gemini';
export interface ProviderConfig {
    provider: AiProvider;
    apiKey: string;
    model: string;
}
export interface ParsedExcel {
    headers: string[];
    rows: string[][];
    rowCount: number;
    columnCount: number;
    fileName: string;
    fileSize: number;
}
export interface ColumnMapping {
    brandName: number;
    packing: number;
    batch: number;
    expiry: number;
    mrp: number;
    qty: number;
}
export interface MedicineRow {
    index: number;
    brand: string;
    packing: string;
    batch: string;
    expiry: string;
    mrp: string;
    qty: string;
}
export interface AiMedicineData {
    'Medicine Name': string;
    'Brand Name': string;
    'Manufacturer': string;
    'Category': string;
    'SKU': string;
    'Strength': string;
    'Pack Form': string;
    'Consume': string;
    'Veg/NonVeg': string;
    'Marketer': string;
    'Shelf Life': string;
    'GST (%)': number;
    'Description': string;
    'Features': string;
    'Benefits': string;
    'Usage': string;
    'Ingredients': string;
    'Safety Info': string;
    'Storage': string;
    'Weight': string;
}
export interface GenerateRequest {
    provider: AiProvider;
    apiKey: string;
    model: string;
    batchSize: number;
    outputFileName: string;
    columnMapping: ColumnMapping;
}
export interface ProgressEvent {
    type: 'progress' | 'batch_done' | 'error' | 'complete';
    batch?: number;
    totalBatches?: number;
    processed?: number;
    total?: number;
    message?: string;
    downloadId?: string;
}
export declare const REQUIRED_COLUMNS: readonly ["Image", "Gallery", "Medicine Name", "Brand Name", "Manufacturer", "Category", "Stock", "Price", "MRP", "Batch #", "Expiry", "SKU", "Strength", "Pack Form", "Consume", "Veg/NonVeg", "Min Stock", "Marketer", "Mfg Date", "Shelf Life", "GST (%)", "Country", "Description", "Features", "Benefits", "Usage", "Ingredients", "Safety Info", "Storage", "Weight"];
export declare const FOOTER_KEYWORDS: string[];
