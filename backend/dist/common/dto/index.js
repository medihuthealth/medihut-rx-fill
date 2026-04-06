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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartGenerateDto = exports.ColumnMappingDto = exports.ValidateKeyDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ValidateKeyDto {
    provider;
    apiKey;
    model;
}
exports.ValidateKeyDto = ValidateKeyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['claude', 'openai', 'gemini']),
    __metadata("design:type", String)
], ValidateKeyDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ValidateKeyDto.prototype, "apiKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ValidateKeyDto.prototype, "model", void 0);
class ColumnMappingDto {
    brandName;
    packing;
    batch;
    expiry;
    mrp;
    qty;
}
exports.ColumnMappingDto = ColumnMappingDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-1),
    __metadata("design:type", Number)
], ColumnMappingDto.prototype, "brandName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-1),
    __metadata("design:type", Number)
], ColumnMappingDto.prototype, "packing", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-1),
    __metadata("design:type", Number)
], ColumnMappingDto.prototype, "batch", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-1),
    __metadata("design:type", Number)
], ColumnMappingDto.prototype, "expiry", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-1),
    __metadata("design:type", Number)
], ColumnMappingDto.prototype, "mrp", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-1),
    __metadata("design:type", Number)
], ColumnMappingDto.prototype, "qty", void 0);
class StartGenerateDto {
    provider;
    apiKey;
    model;
    batchSize;
    outputFileName;
    uploadId;
    columnMapping;
}
exports.StartGenerateDto = StartGenerateDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['claude', 'openai', 'gemini']),
    __metadata("design:type", String)
], StartGenerateDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], StartGenerateDto.prototype, "apiKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], StartGenerateDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(20),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], StartGenerateDto.prototype, "batchSize", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], StartGenerateDto.prototype, "outputFileName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], StartGenerateDto.prototype, "uploadId", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ColumnMappingDto),
    __metadata("design:type", ColumnMappingDto)
], StartGenerateDto.prototype, "columnMapping", void 0);
//# sourceMappingURL=index.js.map