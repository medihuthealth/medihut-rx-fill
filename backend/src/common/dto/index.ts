import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateKeyDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['claude', 'openai', 'gemini'])
  provider!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;
}

export class ColumnMappingDto {
  @IsNumber()
  @Min(-1)
  brandName!: number;

  @IsNumber()
  @Min(-1)
  packing!: number;

  @IsNumber()
  @Min(-1)
  batch!: number;

  @IsNumber()
  @Min(-1)
  expiry!: number;

  @IsNumber()
  @Min(-1)
  mrp!: number;

  @IsNumber()
  @Min(-1)
  qty!: number;
}

export class StartGenerateDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['claude', 'openai', 'gemini'])
  provider!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  batchSize!: number;

  @IsString()
  @IsOptional()
  outputFileName?: string;

  @IsString()
  @IsNotEmpty()
  uploadId!: string;

  // ✅ Fix: ValidateNested + @Type so the nested object survives ValidationPipe whitelist
  @ValidateNested()
  @Type(() => ColumnMappingDto)
  columnMapping!: ColumnMappingDto;
}
