import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ExcelService } from '../excel/excel.service';
import { MedicineRow, AiMedicineData, ColumnMapping, ProgressEvent } from '../common/types';

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  /** uploadId → paused flag */
  private readonly pauseMap = new Map<string, boolean>();

  constructor(
    private readonly aiService: AiService,
    private readonly excelService: ExcelService,
  ) {}

  // ── Pause / resume ──────────────────────────────────────────
  pauseJob(uploadId: string) {
    this.pauseMap.set(uploadId, true);
    this.logger.log(`Job paused: ${uploadId}`);
  }

  resumeJob(uploadId: string) {
    this.pauseMap.set(uploadId, false);
    this.logger.log(`Job resumed: ${uploadId}`);
  }

  private isPaused(uploadId: string) {
    return this.pauseMap.get(uploadId) === true;
  }

  /**
   * Run the generation process, yielding progress events via an async generator.
   * – Emits a `partialDownloadId` in every `batch_done` event so the frontend
   *   can offer "Download so far" after each batch.
   * – Respects pause/resume between batches.
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
    this.pauseMap.set(uploadId, false); // start unpaused

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
      // ── Pause polling ─────────────────────────────────────
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
            if (x.packing) line += ` (Pack: ${x.packing})`;
            return line;
          })
          .join('\n');

        const aiResult = await this.aiService.callProvider(
          provider,
          apiKey,
          model,
          medicineList,
          batch.length,
        );

        this.matchResults(batch, aiResult.data, filledMap);
        processed += batch.length;

        // ── Partial download after each successful batch ──────
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
      } catch (error: any) {
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

      // Inter-batch delay: breathing room between Claude requests (5 s)
      if (b < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }

    // Cleanup pause flag
    this.pauseMap.delete(uploadId);

    // 4. Build final output
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
   * Map AI results back to input rows POSITIONALLY.
   * The AI returns in the same order as the input list.
   * Brand Name is always overwritten with the exact input string.
   */
  private matchResults(
    batch: MedicineRow[],
    aiData: AiMedicineData[],
    filledMap: Map<string, AiMedicineData>,
  ): void {
    const norm = (s: string) => String(s).toUpperCase().replace(/\s+/g, ' ').trim();
    const len = Math.min(batch.length, aiData.length);

    for (let i = 0; i < len; i++) {
      const d = { ...aiData[i] };
      d['Brand Name'] = batch[i].brand;
      filledMap.set(norm(batch[i].brand), d);
    }
  }
}
