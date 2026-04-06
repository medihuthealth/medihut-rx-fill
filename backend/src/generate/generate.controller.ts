import { Controller, Post, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import * as express from 'express';
import { GenerateService } from './generate.service';
import { StartGenerateDto } from '../common/dto';
import { ExcelService } from '../excel/excel.service';
import type { AiProvider } from '../common/types';

@Controller('api/generate')
export class GenerateController {
  constructor(
    private readonly generateService: GenerateService,
    private readonly excelService: ExcelService,
  ) {}

  @Post('start')
  async startGeneration(@Body() dto: StartGenerateDto, @Res() res: express.Response) {
    // Guard: columnMapping must be present (sanity check beyond DTO validation)
    if (!dto.columnMapping) {
      throw new HttpException(
        'columnMapping is required. Please map at least the Brand Name column.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Guard: brandName column must be mapped
    if (dto.columnMapping.brandName == null || dto.columnMapping.brandName < 0) {
      throw new HttpException(
        'Brand Name column mapping is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify upload exists
    const upload = this.excelService.getUpload(dto.uploadId);
    if (!upload) {
      throw new HttpException(
        'Upload not found or expired. Please re-upload your file.',
        HttpStatus.NOT_FOUND,
      );
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const generator = this.generateService.generate(
        dto.uploadId,
        dto.provider as AiProvider,
        dto.apiKey,
        dto.model,
        dto.batchSize,
        dto.columnMapping,
        dto.outputFileName || 'medicine_catalog_complete.xlsx',
      );

      for await (const event of generator) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
