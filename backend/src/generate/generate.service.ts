import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ExcelService } from '../excel/excel.service';
import { MedicineRow, AiMedicineData, ColumnMapping, ProgressEvent } from '../common/types';

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly excelService: ExcelService,
  ) {}

  /**
   * Run the generation process, yielding progress events via an async generator
   */
  async *generate(
    uploadId: string,
    provider: 'claude' | 'openai' | 'gemini',
    apiKey: string,
    model: string,
    batchSize: number,
    columnMapping: ColumnMapping,
    outputFileName: string,
  ): AsyncGenerator<ProgressEvent> {
    // 1. Extract medicine rows
    const rows = this.excelService.extractMedicineRows(uploadId, columnMapping);

    if (rows.length === 0) {
      yield { type: 'error', message: 'No valid medicine rows found' };
      return;
    }

    this.logger.log(`Starting generation: ${rows.length} medicines, batch size ${batchSize}`);

    // 2. Create batches
    const batches: MedicineRow[][] = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      batches.push(rows.slice(i, i + batchSize));
    }

    const filledMap = new Map<string, AiMedicineData>();
    let processed = 0;

    // 3. Process each batch
    for (let b = 0; b < batches.length; b++) {
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
        // Build numbered medicine list with packing context for better AI disambiguation
        const medicineList = batch
          .map((x, i) => {
            let line = `${i + 1}. ${x.brand}`;
            if (x.packing) line += ` (Pack: ${x.packing})`;
            return line;
          })
          .join('\n');

        const aiData = await this.aiService.callProvider(provider, apiKey, model, medicineList);

        // Match AI results to input rows
        this.matchResults(batch, aiData, filledMap);

        processed += batch.length;

        yield {
          type: 'batch_done',
          batch: b + 1,
          totalBatches: batches.length,
          processed,
          total: rows.length,
          message: `Batch ${b + 1}/${batches.length} — ${batch.length} medicines ✓`,
        };
      } catch (error: any) {
        processed += batch.length;

        this.logger.error(`Batch ${b + 1} failed: ${error.message}`);

        yield {
          type: 'error',
          batch: b + 1,
          totalBatches: batches.length,
          processed,
          total: rows.length,
          message: `Batch ${b + 1} failed: ${error.message?.slice(0, 100)}`,
        };
      }
    }

    // 4. Build output and store for download
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

  /**
   * Match AI results to input medicine rows using fuzzy matching.
   * This is the key fix for wrong medicine names — we enforce that
   * the brand name in output matches the input.
   */
  private matchResults(
    batch: MedicineRow[],
    aiData: AiMedicineData[],
    filledMap: Map<string, AiMedicineData>,
  ): void {
    const norm = (s: string) => String(s).toUpperCase().replace(/\s+/g, ' ').trim();

    // First pass: exact or fuzzy match by brand name
    for (const d of aiData) {
      const aiBrand = norm(d['Brand Name'] || '');
      if (!aiBrand) continue;

      const matched = batch.find((x) => {
        const inputBrand = norm(x.brand);
        return (
          inputBrand === aiBrand ||
          aiBrand.includes(inputBrand.slice(0, 7)) ||
          inputBrand.includes(aiBrand.slice(0, 7))
        );
      });

      if (matched) {
        // CRITICAL: Override the brand name to match exactly what was in the input
        d['Brand Name'] = matched.brand;
        filledMap.set(norm(matched.brand), d);
      }
    }

    // Second pass: positional fallback for unmatched items
    aiData.forEach((d, i) => {
      if (i < batch.length && !filledMap.has(norm(batch[i].brand))) {
        // Override brand name to match input
        d['Brand Name'] = batch[i].brand;
        filledMap.set(norm(batch[i].brand), d);
      }
    });
  }
}
