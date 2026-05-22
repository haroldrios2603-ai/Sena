/**
 * Módulo que agrupa providers y controladores para audit.
 */
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AuditController],
  providers: [AuditService, RolesGuard],
  exports: [AuditService],
})
/**
 * Clase AuditModule que implementa la lógica principal de audit.
 */
/**
 * Clase AuditModule que implementa la lógica principal de audit.
 */
/**
 * Clase AuditModule que implementa la lógica principal de audit.
 */
export class AuditModule {}
