import * as express from 'express';
import { ExcelService } from './excel.service';
export declare class ExcelController {
    private readonly excelService;
    constructor(excelService: ExcelService);
    uploadFile(file: Express.Multer.File): Promise<{
        uploadId: string;
        fileName: string;
        fileSize: number;
        headers: string[];
        rowCount: number;
        columnCount: number;
        sampleRows: string[][];
    }>;
    downloadFile(id: string, res: express.Response): Promise<void>;
}
