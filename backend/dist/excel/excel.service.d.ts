import { ParsedExcel, MedicineRow, AiMedicineData, ColumnMapping } from '../common/types';
export declare class ExcelService {
    private readonly logger;
    private uploads;
    private results;
    parseUpload(buffer: Buffer, originalName: string, fileSize: number): ParsedExcel & {
        uploadId: string;
    };
    getUpload(uploadId: string): ParsedExcel | undefined;
    extractMedicineRows(uploadId: string, mapping: ColumnMapping): MedicineRow[];
    private formatExpiry;
    buildOutput(rows: MedicineRow[], filledMap: Map<string, AiMedicineData>): any[][];
    generateExcelBuffer(outputData: any[][], fileName: string): Buffer;
    storeResult(downloadId: string, data: any[][], fileName: string): void;
    getResult(downloadId: string): {
        data: any[][];
        fileName: string;
    } | undefined;
    normalize(s: string): string;
}
