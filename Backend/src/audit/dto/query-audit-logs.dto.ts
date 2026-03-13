import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditOperation, AuditResult } from '@prisma/client';

export class QueryAuditLogsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsEnum(AuditOperation)
  operation?: AuditOperation;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  recordId?: string;

  @IsOptional()
  @IsEnum(AuditResult)
  result?: AuditResult;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 25;
}
