import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ParsedExcel, MedicineRow, AiMedicineData, ColumnMapping, REQUIRED_COLUMNS, FOOTER_KEYWORDS } from '../common/types';

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  // In-memory store for uploaded files and generated results
  private uploads = new Map<string, ParsedExcel>();
  private results = new Map<string, { data: any[][]; fileName: string }>();

  /**
   * Parse an uploaded Excel/CSV file
   */
  parseUpload(buffer: Buffer, originalName: string, fileSize: number): ParsedExcel & { uploadId: string } {
    const ext = originalName.split('.').pop()?.toLowerCase() || '';

    let workbook: XLSX.WorkBook;
    if (ext === 'csv') {
      workbook = XLSX.read(buffer.toString('utf-8'), { type: 'string', raw: false });
    } else {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    // Find header row (first row with >= 3 non-empty cells)
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

    const parsed: ParsedExcel = {
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

  /**
   * Get a previously uploaded file's data
   */
  getUpload(uploadId: string): ParsedExcel | undefined {
    return this.uploads.get(uploadId);
  }

  /**
   * Extract medicine rows from parsed data using column mapping
   */
  extractMedicineRows(uploadId: string, mapping: ColumnMapping): MedicineRow[] {
    const upload = this.uploads.get(uploadId);
    if (!upload) throw new Error('Upload not found');

    const getVal = (row: string[], colIndex: number): string => {
      if (colIndex < 0 || colIndex >= row.length) return '';
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
      .filter(
        (r) =>
          r.brand &&
          !FOOTER_KEYWORDS.some((kw) => r.brand.toUpperCase().includes(kw)),
      );
  }

  /**
   * Convert expiry serial number to date string if needed
   */
  private formatExpiry(expiry: string): string {
    if (!expiry) return '';
    const num = Number(expiry);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      // Excel serial date
      try {
        const dt = XLSX.SSF.parse_date_code(num);
        if (dt) {
          return `${dt.y}-${String(dt.m).padStart(2, '0')}-${String(dt.d).padStart(2, '0')}`;
        }
      } catch {
        // ignore
      }
    }
    return expiry;
  }

  /**
   * Build the 30-column output array
   */
  buildOutput(rows: MedicineRow[], filledMap: Map<string, AiMedicineData>): any[][] {
    const output: any[][] = [[...REQUIRED_COLUMNS]];

    for (const row of rows) {
      const norm = this.normalize(row.brand);
      const d: Partial<AiMedicineData> = filledMap.get(norm) || {};
      const expiry = this.formatExpiry(row.expiry);

      output.push([
        '',                                                        // Image
        '',                                                        // Gallery
        d['Medicine Name'] || '',                                 // Medicine Name
        d['Brand Name'] || row.brand,                             // Brand Name
        d['Manufacturer'] || '',                                  // Manufacturer
        d['Category'] || '',                                      // Category
        row.qty !== '' ? row.qty : '',                            // Stock
        row.mrp !== '' ? row.mrp : '',                            // Price
        row.mrp !== '' ? row.mrp : '',                            // MRP
        row.batch !== '' ? row.batch : '',                        // Batch #
        expiry,                                                    // Expiry
        d['SKU'] || '',                                           // SKU
        d['Strength'] || '',                                      // Strength
        d['Pack Form'] || row.packing || 'Strip',                 // Pack Form
        d['Consume'] || 'Oral',                                   // Consume
        d['Veg/NonVeg'] || 'Veg',                                 // Veg/NonVeg
        5,                                                         // Min Stock
        d['Marketer'] || d['Manufacturer'] || '',                 // Marketer
        '',                                                        // Mfg Date
        d['Shelf Life'] || '24 Months',                           // Shelf Life
        d['GST (%)'] !== undefined ? d['GST (%)'] : 12,          // GST (%)
        'India',                                                   // Country
        d['Description'] || '',                                   // Description
        d['Features'] || '',                                      // Features
        d['Benefits'] || '',                                      // Benefits
        d['Usage'] || '',                                         // Usage
        d['Ingredients'] || '',                                   // Ingredients
        d['Safety Info'] || '',                                   // Safety Info
        d['Storage'] || '',                                       // Storage
        d['Weight'] || row.packing || '',                         // Weight
      ]);
    }

    return output;
  }

  /**
   * Generate downloadable Excel buffer from output data
   */
  generateExcelBuffer(outputData: any[][], fileName: string): Buffer {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(outputData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 28 },
      { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
      { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 28 },
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 45 }, { wch: 40 },
      { wch: 40 }, { wch: 35 }, { wch: 35 }, { wch: 40 }, { wch: 35 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return Buffer.from(
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    );
  }

  /**
   * Store result for download
   */
  storeResult(downloadId: string, data: any[][], fileName: string): void {
    this.results.set(downloadId, { data, fileName });
    // Auto-cleanup after 30 minutes
    setTimeout(() => this.results.delete(downloadId), 30 * 60 * 1000);
  }

  /**
   * Get stored result
   */
  getResult(downloadId: string): { data: any[][]; fileName: string } | undefined {
    return this.results.get(downloadId);
  }

  /**
   * Normalize a string for comparison
   */
  normalize(s: string): string {
    return String(s).toUpperCase().replace(/\s+/g, ' ').trim();
  }
}
