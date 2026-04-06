"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateController = void 0;
const common_1 = require("@nestjs/common");
const express = __importStar(require("express"));
const generate_service_1 = require("./generate.service");
const dto_1 = require("../common/dto");
const excel_service_1 = require("../excel/excel.service");
let GenerateController = class GenerateController {
    generateService;
    excelService;
    constructor(generateService, excelService) {
        this.generateService = generateService;
        this.excelService = excelService;
    }
    async startGeneration(dto, res) {
        if (!dto.columnMapping) {
            throw new common_1.HttpException('columnMapping is required. Please map at least the Brand Name column.', common_1.HttpStatus.BAD_REQUEST);
        }
        if (dto.columnMapping.brandName == null || dto.columnMapping.brandName < 0) {
            throw new common_1.HttpException('Brand Name column mapping is required.', common_1.HttpStatus.BAD_REQUEST);
        }
        const upload = this.excelService.getUpload(dto.uploadId);
        if (!upload) {
            throw new common_1.HttpException('Upload not found or expired. Please re-upload your file.', common_1.HttpStatus.NOT_FOUND);
        }
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        try {
            const generator = this.generateService.generate(dto.uploadId, dto.provider, dto.apiKey, dto.model, dto.batchSize, dto.columnMapping, dto.outputFileName || 'medicine_catalog_complete.xlsx');
            for await (const event of generator) {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }
        }
        catch (error) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    }
    pauseGeneration(body) {
        if (!body.uploadId)
            throw new common_1.HttpException('uploadId required', common_1.HttpStatus.BAD_REQUEST);
        this.generateService.pauseJob(body.uploadId);
        return { ok: true, status: 'paused' };
    }
    resumeGeneration(body) {
        if (!body.uploadId)
            throw new common_1.HttpException('uploadId required', common_1.HttpStatus.BAD_REQUEST);
        this.generateService.resumeJob(body.uploadId);
        return { ok: true, status: 'resumed' };
    }
};
exports.GenerateController = GenerateController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.StartGenerateDto, Object]),
    __metadata("design:returntype", Promise)
], GenerateController.prototype, "startGeneration", null);
__decorate([
    (0, common_1.Post)('pause'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GenerateController.prototype, "pauseGeneration", null);
__decorate([
    (0, common_1.Post)('resume'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GenerateController.prototype, "resumeGeneration", null);
exports.GenerateController = GenerateController = __decorate([
    (0, common_1.Controller)('api/generate'),
    __metadata("design:paramtypes", [generate_service_1.GenerateService,
        excel_service_1.ExcelService])
], GenerateController);
//# sourceMappingURL=generate.controller.js.map