export declare class ValidateKeyDto {
    provider: string;
    apiKey: string;
    model: string;
}
export declare class ColumnMappingDto {
    brandName: number;
    packing: number;
    batch: number;
    expiry: number;
    mrp: number;
    qty: number;
}
export declare class StartGenerateDto {
    provider: string;
    apiKey: string;
    model: string;
    batchSize: number;
    outputFileName?: string;
    uploadId: string;
    columnMapping: ColumnMappingDto;
}
