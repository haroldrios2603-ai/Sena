/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Enumeración PublicPaymentMethod que lista valores discretos usados en dto.
 */
/**
 * Enumeración PublicPaymentMethod que lista valores discretos usados en dto.
 */
/**
 * Enumeración PublicPaymentMethod que lista valores discretos usados en dto.
 */
export enum PublicPaymentMethod {
  NEQUI = 'NEQUI',
  CARD = 'CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
}

/**
 * Clase CreatePublicCheckoutDto que implementa la lógica principal de dto.
 */
/**
 * Clase CreatePublicCheckoutDto que implementa la lógica principal de dto.
 */
/**
 * Clase CreatePublicCheckoutDto que implementa la lógica principal de dto.
 */
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
