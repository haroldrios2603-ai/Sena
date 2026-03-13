import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScreenPermissionItemDto {
  @IsString()
  @IsNotEmpty()
  screenKey: string;

  @IsBoolean()
  canView: boolean;
}

export class UpdateScreenPermissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScreenPermissionItemDto)
  permissions: ScreenPermissionItemDto[];
}
