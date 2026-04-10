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
export class PaymentsModule {}
