import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { ValidateKeyDto } from '../common/dto';
import type { AiProvider } from '../common/types';

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('validate')
  async validateKey(@Body() dto: ValidateKeyDto) {
    try {
      const result = await this.aiService.validateKey(dto.provider as AiProvider, dto.apiKey, dto.model);
      if (!result.valid) {
        throw new HttpException(result.message, HttpStatus.UNAUTHORIZED);
      }
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Key validation failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
