import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { ExcelModule } from './excel/excel.module';
import { GenerateModule } from './generate/generate.module';
import { AppController } from './app.controller';

@Module({
  imports: [AiModule, ExcelModule, GenerateModule],
  controllers: [AppController],
})
export class AppModule {}
