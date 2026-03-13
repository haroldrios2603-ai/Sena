import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  APP_SCREEN_DEFINITIONS,
  DEFAULT_ROLE_SCREEN_PERMISSIONS,
} from './permissions.constants';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listScreens() {
    await this.syncScreens();
    return this.prisma.appScreen.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getRolePermissions(role: Role) {
    await this.syncScreens();
    const screens = await this.listScreens();
    const explicit = await this.prisma.roleScreenPermission.findMany({
      where: { role },
    });
    const explicitMap = new Map(explicit.map((item) => [item.screenKey, item.canView]));

    return screens.map((screen) => ({
      screenKey: screen.key,
      screenName: screen.name,
      route: screen.route,
      canView: explicitMap.has(screen.key)
        ? explicitMap.get(screen.key)
        : this.getDefaultRolePermission(role, screen.key),
      source: explicitMap.has(screen.key) ? 'explicit' : 'default',
    }));
  }

  async saveRolePermissions(
    role: Role,
    permissions: Array<{ screenKey: string; canView: boolean }>,
  ) {
    await this.syncScreens();
    await this.assertScreenKeysExist(permissions.map((item) => item.screenKey));

    await this.prisma.$transaction(
      permissions.map((item) =>
        this.prisma.roleScreenPermission.upsert({
          where: {
            role_screenKey: {
              role,
              screenKey: item.screenKey,
            },
          },
          update: { canView: item.canView },
          create: {
            role,
            screenKey: item.screenKey,
            canView: item.canView,
          },
        }),
      ),
    );

    return this.getRolePermissions(role);
  }

  async getUserPermissions(userId: string) {
    const user = await this.ensureUser(userId);
    await this.syncScreens();
    const screens = await this.listScreens();

    const explicit = await this.prisma.userScreenPermission.findMany({
      where: { userId },
    });
    const explicitMap = new Map(explicit.map((item) => [item.screenKey, item.canView]));

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      permissions: screens.map((screen) => {
        const inherited = this.getDefaultRolePermission(user.role, screen.key);
        return {
          screenKey: screen.key,
          screenName: screen.name,
          route: screen.route,
          canView: explicitMap.has(screen.key)
            ? explicitMap.get(screen.key)
            : inherited,
          source: explicitMap.has(screen.key) ? 'explicit-user' : 'role-default',
          inherited,
        };
      }),
    };
  }

  async saveUserPermissions(
    userId: string,
    permissions: Array<{ screenKey: string; canView: boolean }>,
  ) {
    await this.ensureUser(userId);
    await this.syncScreens();
    await this.assertScreenKeysExist(permissions.map((item) => item.screenKey));

    await this.prisma.$transaction(
      permissions.map((item) =>
        this.prisma.userScreenPermission.upsert({
          where: {
            userId_screenKey: {
              userId,
              screenKey: item.screenKey,
            },
          },
          update: { canView: item.canView },
          create: {
            userId,
            screenKey: item.screenKey,
            canView: item.canView,
          },
        }),
      ),
    );

    return this.getUserPermissions(userId);
  }

  async getEffectivePermissionsForUser(userId: string) {
    const user = await this.ensureUser(userId);
    await this.syncScreens();

    const screens = await this.listScreens();
    const explicit = await this.prisma.userScreenPermission.findMany({
      where: { userId },
    });
    const explicitMap = new Map(explicit.map((item) => [item.screenKey, item.canView]));

    const effective = screens.map((screen) => ({
      screenKey: screen.key,
      canView: explicitMap.has(screen.key)
        ? explicitMap.get(screen.key)
        : this.getDefaultRolePermission(user.role, screen.key),
    }));

    return {
      userId: user.id,
      role: user.role,
      permissions: effective,
      allowedScreenKeys: effective
        .filter((item) => item.canView)
        .map((item) => item.screenKey),
    };
  }

  async canUserViewScreen(
    userId: string,
    role: Role,
    screenKey: string,
  ): Promise<boolean> {
    await this.syncScreens();
    await this.assertScreenKeysExist([screenKey]);

    const userPermission = await this.prisma.userScreenPermission.findUnique({
      where: {
        userId_screenKey: {
          userId,
          screenKey,
        },
      },
      select: { canView: true },
    });

    if (userPermission) {
      return userPermission.canView;
    }

    const rolePermission = await this.prisma.roleScreenPermission.findUnique({
      where: {
        role_screenKey: {
          role,
          screenKey,
        },
      },
      select: { canView: true },
    });

    if (rolePermission) {
      return rolePermission.canView;
    }

    return this.getDefaultRolePermission(role, screenKey);
  }

  getDefaultRolePermission(role: Role, screenKey: string): boolean {
    return DEFAULT_ROLE_SCREEN_PERMISSIONS[role]?.includes(screenKey) ?? false;
  }

  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  private async syncScreens() {
    await this.prisma.$transaction(
      APP_SCREEN_DEFINITIONS.map((screen) =>
        this.prisma.appScreen.upsert({
          where: { key: screen.key },
          update: {
            name: screen.name,
            description: screen.description,
            route: screen.route,
            isActive: true,
          },
          create: {
            key: screen.key,
            name: screen.name,
            description: screen.description,
            route: screen.route,
            isActive: true,
          },
        }),
      ),
    );
  }

  private async assertScreenKeysExist(screenKeys: string[]) {
    const uniqueScreenKeys = Array.from(new Set(screenKeys));

    if (!uniqueScreenKeys.length) {
      throw new BadRequestException('Debe enviar al menos una pantalla');
    }

    const records = await this.prisma.appScreen.findMany({
      where: { key: { in: uniqueScreenKeys } },
      select: { key: true },
    });

    if (records.length !== uniqueScreenKeys.length) {
      const found = new Set(records.map((record) => record.key));
      const missing = uniqueScreenKeys.filter((key) => !found.has(key));
      throw new BadRequestException(
        `Pantallas no válidas: ${missing.join(', ')}`,
      );
    }
  }
}
