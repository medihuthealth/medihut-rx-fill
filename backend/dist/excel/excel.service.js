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
var ExcelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
const types_1 = require("../common/types");
let ExcelService = ExcelService_1 = class ExcelService {
    logger = new common_1.Logger(ExcelService_1.name);
    uploads = new Map();
    results = new Map();
    parseUpload(buffer, originalName, fileSize) {
        const ext = originalName.split('.').pop()?.toLowerCase() || '';
        let workbook;
        if (ext === 'csv') {
            workbook = XLSX.read(buffer.toString('utf-8'), { type: 'string', raw: false });
        }
        else {
            workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
        }
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
        });
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(12, rawData.length); i++) {
            if (rawData[i].filter((c) => String(c).trim()).length >= 3) {
                headerRowIndex = i;
                break;
            }
        }
        const headers = rawData[headerRowIndex].map((h) => String(h).trim());
        const rows = rawData
            .slice(headerRowIndex + 1)
            .filter((r) => r.some((c) => String(c).trim()));
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const parsed = {
            headers,
            rows: rows.map((r) => r.map((c) => String(c))),
            rowCount: rows.length,
            columnCount: headers.filter(Boolean).length,
            fileName: originalName,
            fileSize,
        };
        this.uploads.set(uploadId, parsed);
        this.logger.log(`Parsed ${originalName}: ${rows.length} rows, ${headers.length} columns`);
        return { ...parsed, uploadId };
    }
    getUpload(uploadId) {
        return this.uploads.get(uploadId);
    }
    extractMedicineRows(uploadId, mapping) {
        const upload = this.uploads.get(uploadId);
        if (!upload)
            throw new Error('Upload not found');
        const getVal = (row, colIndex) => {
            if (colIndex < 0 || colIndex >= row.length)
                return '';
            return String(row[colIndex] || '').trim();
        };
        return upload.rows
            .map((row, index) => ({
            index,
            brand: getVal(row, mapping.brandName),
            packing: getVal(row, mapping.packing),
            batch: getVal(row, mapping.batch),
            expiry: getVal(row, mapping.expiry),
            mrp: getVal(row, mapping.mrp),
            qty: getVal(row, mapping.qty),
        }))
            .filter((r) => r.brand &&
            !types_1.FOOTER_KEYWORDS.some((kw) => r.brand.toUpperCase().includes(kw)));
    }
    formatExpiry(expiry) {
        if (!expiry)
            return '';
        const num = Number(expiry);
        if (!isNaN(num) && num > 30000 && num < 60000) {
            try {
                const dt = XLSX.SSF.parse_date_code(num);
                if (dt) {
                    return `${dt.y}-${String(dt.m).padStart(2, '0')}-${String(dt.d).padStart(2, '0')}`;
                }
            }
            catch {
            }
        }
        return expiry;
    }
    buildOutput(rows, filledMap) {
        const output = [[...types_1.REQUIRED_COLUMNS]];
        for (const row of rows) {
            const norm = this.normalize(row.brand);
            const d = filledMap.get(norm) || {};
            const expiry = this.formatExpiry(row.expiry);
            output.push([
                '',
                '',
                d['Medicine Name'] || '',
                d['Brand Name'] || row.brand,
                d['Manufacturer'] || '',
                d['Category'] || '',
                row.qty !== '' ? row.qty : '',
                row.mrp !== '' ? row.mrp : '',
                row.mrp !== '' ? row.mrp : '',
                row.batch !== '' ? row.batch : '',
                expiry,
                d['SKU'] || '',
                d['Strength'] || '',
                d['Pack Form'] || row.packing || 'Strip',
                d['Consume'] || 'Oral',
                d['Veg/NonVeg'] || 'Veg',
                5,
                d['Marketer'] || d['Manufacturer'] || '',
                '',
                d['Shelf Life'] || '24 Months',
                d['GST (%)'] !== undefined ? d['GST (%)'] : 12,
                'India',
                d['Description'] || '',
                d['Features'] || '',
                d['Benefits'] || '',
                d['Usage'] || '',
                d['Ingredients'] || '',
                d['Safety Info'] || '',
                d['Storage'] || '',
                d['Weight'] || row.packing || '',
            ]);
        }
        return output;
    }
    generateExcelBuffer(outputData, fileName) {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(outputData);
        worksheet['!cols'] = [
            { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 28 },
            { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
            { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 28 },
            { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 45 }, { wch: 40 },
            { wch: 40 }, { wch: 35 }, { wch: 35 }, { wch: 40 }, { wch: 35 }, { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    }
    storeResult(downloadId, data, fileName) {
        this.results.set(downloadId, { data, fileName });
        setTimeout(() => this.results.delete(downloadId), 30 * 60 * 1000);
    }
    getResult(downloadId) {
        return this.results.get(downloadId);
    }
    normalize(s) {
        return String(s).toUpperCase().replace(/\s+/g, ' ').trim();
    }
};
exports.ExcelService = ExcelService;
exports.ExcelService = ExcelService = ExcelService_1 = __decorate([
    (0, common_1.Injectable)()
], ExcelService);
//# sourceMappingURL=excel.service.js.map