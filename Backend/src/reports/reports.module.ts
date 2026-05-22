/**
 * Módulo que agrupa providers y controladores para reports.
 */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsController } from './reports.controller';
import { ReportsExportService } from './reports-export.service';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule, PassportModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsExportService, RolesGuard],
})
/**
 * Clase ReportsModule que implementa la lógica principal de reports.
 */
/**
 * Clase ReportsModule que implementa la lógica principal de reports.
 */
/**
 * Clase ReportsModule que implementa la lógica principal de reports.
 */
export class ReportsModule {}
