import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { PassportModule } from '@nestjs/passport';

/**
 * Módulo dedicado a la administración de usuarios y roles.
 */
@Module({
  imports: [PassportModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, RolesGuard],
})
export class UsersModule {}
