import { Module } from '@nestjs/common';
import { GenerateService } from './generate.service';
import { GenerateController } from './generate.controller';
import { AiModule } from '../ai/ai.module';
import { ExcelModule } from '../excel/excel.module';

@Module({
  imports: [AiModule, ExcelModule],
  providers: [GenerateService],
  controllers: [GenerateController],
})
export class GenerateModule {}
