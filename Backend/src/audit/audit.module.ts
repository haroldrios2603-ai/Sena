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
export class AuditModule {}
