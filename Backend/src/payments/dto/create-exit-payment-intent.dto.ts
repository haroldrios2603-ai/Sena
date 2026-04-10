import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class CreateExitPaymentIntentDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  expiresInMinutes?: number;

  @IsOptional()
  @IsPositive()
  overrideAmount?: number;
}
