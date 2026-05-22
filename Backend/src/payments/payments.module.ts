/**
 * Módulo que agrupa providers y controladores para payments.
 */
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, RolesGuard],
  exports: [PaymentsService],
})
/**
 * Clase PaymentsModule que implementa la lógica principal de payments.
 */
/**
 * Clase PaymentsModule que implementa la lógica principal de payments.
 */
/**
 * Clase PaymentsModule que implementa la lógica principal de payments.
 */
export class PaymentsModule {}
