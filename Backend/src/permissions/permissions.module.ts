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
export class PermissionsModule {}
