"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GenerateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateService = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("../ai/ai.service");
const excel_service_1 = require("../excel/excel.service");
let GenerateService = GenerateService_1 = class GenerateService {
    aiService;
    excelService;
    logger = new common_1.Logger(GenerateService_1.name);
    pauseMap = new Map();
    constructor(aiService, excelService) {
        this.aiService = aiService;
        this.excelService = excelService;
    }
    pauseJob(uploadId) {
        this.pauseMap.set(uploadId, true);
        this.logger.log(`Job paused: ${uploadId}`);
    }
    resumeJob(uploadId) {
        this.pauseMap.set(uploadId, false);
        this.logger.log(`Job resumed: ${uploadId}`);
    }
    isPaused(uploadId) {
        return this.pauseMap.get(uploadId) === true;
    }
    async *generate(uploadId, provider, apiKey, model, batchSize, columnMapping, outputFileName) {
        this.pauseMap.set(uploadId, false);
        const rows = this.excelService.extractMedicineRows(uploadId, columnMapping);
        if (rows.length === 0) {
            yield { type: 'error', message: 'No valid medicine rows found' };
            return;
        }
        this.logger.log(`Starting generation: ${rows.length} medicines, batch size ${batchSize}`);
        const batches = [];
        for (let i = 0; i < rows.length; i += batchSize) {
            batches.push(rows.slice(i, i + batchSize));
        }
        const filledMap = new Map();
        let processed = 0;
        for (let b = 0; b < batches.length; b++) {
            while (this.isPaused(uploadId)) {
                yield {
                    type: 'paused',
                    batch: b + 1,
                    totalBatches: batches.length,
                    processed,
                    total: rows.length,
                    message: `⏸ Paused — click Resume to continue`,
                };
                await new Promise((r) => setTimeout(r, 2_000));
            }
            const batch = batches[b];
            const start = b * batchSize + 1;
            const end = Math.min(start + batchSize - 1, rows.length);
            yield {
                type: 'progress',
                batch: b + 1,
                totalBatches: batches.length,
                processed,
                total: rows.length,
                message: `Processing batch ${b + 1}/${batches.length} — medicines ${start}–${end}`,
            };
            try {
                const medicineList = batch
                    .map((x, i) => {
                    let line = `${i + 1}. ${x.brand}`;
                    if (x.packing)
                        line += ` (Pack: ${x.packing})`;
                    return line;
                })
                    .join('\n');
                const aiResult = await this.aiService.callProvider(provider, apiKey, model, medicineList, batch.length);
                this.matchResults(batch, aiResult.data, filledMap);
                processed += batch.length;
                const partialOutputData = this.excelService.buildOutput(rows, filledMap);
                const partialId = `partial_${uploadId}_b${b + 1}_${Date.now()}`;
                const partialName = outputFileName.replace('.xlsx', `_partial_batch${b + 1}.xlsx`);
                this.excelService.storeResult(partialId, partialOutputData, partialName);
                yield {
                    type: 'batch_done',
                    batch: b + 1,
                    totalBatches: batches.length,
                    processed,
                    total: rows.length,
                    message: `Batch ${b + 1}/${batches.length} — ${batch.length} medicines ✓`,
                    partialDownloadId: partialId,
                    tokens: aiResult.tokens,
                };
            }
            catch (error) {
                processed += batch.length;
                this.logger.error(`Batch ${b + 1} failed: ${error.message}`);
                yield {
                    type: 'error',
                    batch: b + 1,
                    totalBatches: batches.length,
                    processed,
                    total: rows.length,
                    message: `Batch ${b + 1} failed: ${error.message?.slice(0, 120)}`,
                };
            }
            if (b < batches.length - 1) {
                await new Promise((r) => setTimeout(r, 5_000));
            }
        }
        this.pauseMap.delete(uploadId);
        const outputData = this.excelService.buildOutput(rows, filledMap);
        const downloadId = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this.excelService.storeResult(downloadId, outputData, outputFileName);
        const filledCount = outputData.slice(1).filter((r) => r[2]).length;
        yield {
            type: 'complete',
            processed: rows.length,
            total: rows.length,
            message: `Complete! ${filledCount}/${rows.length} medicines filled.`,
            downloadId,
        };
    }
    matchResults(batch, aiData, filledMap) {
        const norm = (s) => String(s).toUpperCase().replace(/\s+/g, ' ').trim();
        const len = Math.min(batch.length, aiData.length);
        for (let i = 0; i < len; i++) {
            const d = { ...aiData[i] };
            d['Brand Name'] = batch[i].brand;
            filledMap.set(norm(batch[i].brand), d);
        }
    }
};
exports.GenerateService = GenerateService;
exports.GenerateService = GenerateService = GenerateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        excel_service_1.ExcelService])
], GenerateService);
//# sourceMappingURL=generate.service.js.map