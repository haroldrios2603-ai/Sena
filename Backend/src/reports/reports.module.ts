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
export class ReportsModule {}
