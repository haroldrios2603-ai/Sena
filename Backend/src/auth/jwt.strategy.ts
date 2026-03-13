import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Estrategia para validar tokens JWT usando Passport.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // Obtener secreto JWT de variables de entorno.
    // ES: En producción se requiere obligatoriamente JWT_SECRET.
    const secret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'development' ? 'dev-secret' : undefined);
    if (!secret) {
      throw new Error(
        'JWT_SECRET no definido. Configure la variable de entorno para ejecutar en producción.',
      );
    }

    super({
      // Extraer token del encabezado Auth (Bearer)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // La clave secreta debe coincidir con la usada para firmar
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
