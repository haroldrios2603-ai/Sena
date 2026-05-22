/**
 * Módulo que agrupa providers y controladores para permissions.
 */
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
/**
 * Clase PermissionsModule que implementa la lógica principal de permissions.
 */
/**
 * Clase PermissionsModule que implementa la lógica principal de permissions.
 */
/**
 * Clase PermissionsModule que implementa la lógica principal de permissions.
 */
export class PermissionsModule {}
