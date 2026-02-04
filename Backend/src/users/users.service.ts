import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ListUsersDto } from './dto/list-users.dto';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';

/**
 * Servicio para administración de usuarios y asignación de roles.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un usuario operativo con rol asignado por el SUPER_ADMIN.
   */
  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        fullName: createUserDto.fullName,
        passwordHash,
        role: createUserDto.role,
      },
    });

    return this.sanitizeUser(user);
  }

  /**
   * Lista usuarios con filtros por rol/estado.
   */
  async findAll(filters: ListUsersDto) {
    const where: Record<string, unknown> = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (typeof filters.isActive !== 'undefined') {
      where.isActive = filters.isActive === 'true';
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Cambia el rol del usuario objetivo.
   */
  async updateRole(userId: string, updateUserRoleDto: UpdateUserRoleDto) {
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: updateUserRoleDto.role },
    });

    return this.sanitizeUser(user);
  }

  /**
   * Activa o desactiva un usuario.
   */
  async updateStatus(userId: string, updateUserStatusDto: UpdateUserStatusDto) {
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: updateUserStatusDto.isActive },
    });

    return this.sanitizeUser(user);
  }

  /**
   * Confirma que el usuario existe antes de actualizarlo.
   */
  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  /**
   * Elimina campos sensibles antes de responder.
   */
  private sanitizeUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
