import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum PublicPaymentMethod {
  NEQUI = 'NEQUI',
  CARD = 'CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
}

export class CreatePublicCheckoutDto {
  @IsEnum(PublicPaymentMethod)
  method: PublicPaymentMethod;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}
