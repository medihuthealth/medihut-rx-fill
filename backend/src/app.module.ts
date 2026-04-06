import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { ExcelModule } from './excel/excel.module';
import { GenerateModule } from './generate/generate.module';

@Module({
  imports: [AiModule, ExcelModule, GenerateModule],
})
export class AppModule {}
