import { AiService } from '../ai/ai.service';
import { ExcelService } from '../excel/excel.service';
import { ColumnMapping, ProgressEvent } from '../common/types';
export declare class GenerateService {
    private readonly aiService;
    private readonly excelService;
    private readonly logger;
    constructor(aiService: AiService, excelService: ExcelService);
    generate(uploadId: string, provider: 'claude' | 'openai' | 'gemini', apiKey: string, model: string, batchSize: number, columnMapping: ColumnMapping, outputFileName: string): AsyncGenerator<ProgressEvent>;
    private matchResults;
}
