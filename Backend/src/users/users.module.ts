/**
 * Módulo que agrupa providers y controladores para users.
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../database.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PassportModule } from '@nestjs/passport';

/**
 * Módulo dedicado a la administración de usuarios y roles.
 */
@Module({
  imports: [DatabaseModule, PassportModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
/**
 * Clase UsersModule que implementa la lógica principal de users.
 */
/**
 * Clase UsersModule que implementa la lógica principal de users.
 */
/**
 * Clase UsersModule que implementa la lógica principal de users.
 */
export class UsersModule {}
