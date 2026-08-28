/**
 * Estrategia JWT que valida y verifica tokens de autenticación.
 */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Estrategia para validar tokens JWT usando Passport.
 */
/**
 * Clase JwtStrategy que implementa la lógica principal de auth.
 */
/**
 * Clase JwtStrategy que implementa la lógica principal de auth.
 */
/**
 * Clase JwtStrategy que implementa la lógica principal de auth.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = process.env.JWT_SECRET?.trim();
    const secret =
      jwtSecret && jwtSecret.length >= 32
        ? jwtSecret
        : process.env.NODE_ENV === 'production'
          ? (() => {
              throw new Error(
                'JWT_SECRET no definido o demasiado corto. Debe tener al menos 32 caracteres en producción.',
              );
            })()
          : 'dev-secret-rm-parking-32-chars-minimum';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Callback de validación. Retorna el objeto usuario adjunto a la petición.
   */
  validate(payload: { sub?: string; email?: string; role?: string }) {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException(
        'Token invalido: faltan datos de usuario para autorizacion.',
      );
    }

    const allowedRoles = Object.values(Role);
    if (!allowedRoles.includes(payload.role as Role)) {
      throw new UnauthorizedException('Token invalido: rol no reconocido.');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
