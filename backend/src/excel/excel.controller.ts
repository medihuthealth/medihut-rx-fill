import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';
import { ExcelService } from './excel.service';

@Controller('api/excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/csv',
        ];
        const ext = file.originalname?.split('.').pop()?.toLowerCase();
        if (allowed.includes(file.mimetype) || ['xlsx', 'xls', 'csv'].includes(ext || '')) {
          cb(null, true);
        } else {
          cb(new HttpException('Only .xlsx, .xls, .csv files are allowed', HttpStatus.BAD_REQUEST), false);
        }
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = this.excelService.parseUpload(
        file.buffer,
        file.originalname,
        file.size,
      );

      return {
        uploadId: result.uploadId,
        fileName: result.fileName,
        fileSize: result.fileSize,
        headers: result.headers,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        sampleRows: result.rows.slice(0, 3),
      };
    } catch (error: any) {
      throw new HttpException(
        `Failed to parse file: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res: express.Response) {
    const result = this.excelService.getResult(id);
    if (!result) {
      throw new HttpException('Download not found or expired', HttpStatus.NOT_FOUND);
    }

    const buffer = this.excelService.generateExcelBuffer(result.data, result.fileName);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.send(buffer);
  }
}
