/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Clase ScreenPermissionItemDto que implementa la lógica principal de dto.
 */
/**
 * Clase ScreenPermissionItemDto que implementa la lógica principal de dto.
 */
/**
 * Clase ScreenPermissionItemDto que implementa la lógica principal de dto.
 */
export class ScreenPermissionItemDto {
  @IsString()
  @IsNotEmpty()
  screenKey: string;

  @IsBoolean()
  canView: boolean;
}

/**
 * Clase UpdateScreenPermissionsDto que implementa la lógica principal de dto.
 */
/**
 * Clase UpdateScreenPermissionsDto que implementa la lógica principal de dto.
 */
/**
 * Clase UpdateScreenPermissionsDto que implementa la lógica principal de dto.
 */
export class UpdateScreenPermissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScreenPermissionItemDto)
  permissions: ScreenPermissionItemDto[];
}
