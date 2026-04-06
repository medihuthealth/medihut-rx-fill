import * as express from 'express';
import { GenerateService } from './generate.service';
import { StartGenerateDto } from '../common/dto';
import { ExcelService } from '../excel/excel.service';
export declare class GenerateController {
    private readonly generateService;
    private readonly excelService;
    constructor(generateService: GenerateService, excelService: ExcelService);
    startGeneration(dto: StartGenerateDto, res: express.Response): Promise<void>;
    pauseGeneration(body: {
        uploadId: string;
    }): {
        ok: boolean;
        status: string;
    };
    resumeGeneration(body: {
        uploadId: string;
    }): {
        ok: boolean;
        status: string;
    };
}
