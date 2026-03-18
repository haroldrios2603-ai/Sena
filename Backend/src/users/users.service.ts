import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

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
        contactPhone: createUserDto.contactPhone,
        passwordHash,
        role: createUserDto.role,
        ...(createUserDto.documentType ? { documentType: createUserDto.documentType } : {}),
        ...(createUserDto.documentNumber ? { documentNumber: createUserDto.documentNumber } : {}),
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

    if (filters.fullName?.trim()) {
      where.fullName = { contains: filters.fullName.trim(), mode: 'insensitive' };
    }

    if (filters.email?.trim()) {
      where.email = { contains: filters.email.trim(), mode: 'insensitive' };
    }

    if (filters.contactPhone?.trim()) {
      where.contactPhone = { contains: filters.contactPhone.trim(), mode: 'insensitive' };
    }

    if (filters.documentNumber?.trim()) {
      where.documentNumber = { contains: filters.documentNumber.trim(), mode: 'insensitive' };
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
   * Actualiza los campos administrativos permitidos para un usuario.
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const currentUser = await this.ensureUserExists(userId);

    if (
      typeof updateUserDto.email !== 'undefined' &&
      updateUserDto.email !== currentUser.email
    ) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('El correo ya está registrado');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(typeof updateUserDto.fullName !== 'undefined'
          ? { fullName: updateUserDto.fullName }
          : {}),
        ...(typeof updateUserDto.email !== 'undefined'
          ? { email: updateUserDto.email }
          : {}),
        ...(typeof updateUserDto.contactPhone !== 'undefined'
          ? { contactPhone: updateUserDto.contactPhone }
          : {}),
        ...(typeof updateUserDto.role !== 'undefined'
          ? { role: updateUserDto.role }
          : {}),
        ...(typeof updateUserDto.isActive !== 'undefined'
          ? { isActive: updateUserDto.isActive }
          : {}),
        ...(typeof updateUserDto.documentType !== 'undefined'
          ? { documentType: updateUserDto.documentType }
          : {}),
        ...(typeof updateUserDto.documentNumber !== 'undefined'
          ? { documentNumber: updateUserDto.documentNumber }
          : {}),
      },
    });

    return this.sanitizeUser(user);
  }

  /**
   * Archiva un usuario desactivándolo para mantener trazabilidad y permitir restauración.
   */
  async deleteUser(userId: string, actorUserId?: string) {
    const user = await this.ensureUserExists(userId);

    if (actorUserId && actorUserId === userId) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }

    if (!user.isActive) {
      throw new ConflictException('El usuario ya se encuentra archivado');
    }

    const archivedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return {
      id: archivedUser.id,
      email: archivedUser.email,
      archived: true,
      deleted: true,
    };
  }

  /**
   * Restaura un usuario archivado, reactivando su acceso.
   */
  async restoreUser(userId: string) {
    const user = await this.ensureUserExists(userId);

    if (user.isActive) {
      throw new ConflictException('El usuario ya está activo');
    }

    const restoredUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return {
      id: restoredUser.id,
      email: restoredUser.email,
      restored: true,
    };
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
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
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const safeUser: Partial<User> = { ...user };
    delete safeUser.passwordHash;
    return safeUser as Omit<User, 'passwordHash'>;
  }
}
