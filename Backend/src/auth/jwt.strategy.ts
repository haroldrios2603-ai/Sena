import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

/**
 * Estrategia para validar tokens JWT usando Passport.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            // Extraer token del encabezado Auth (Bearer)
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // La clave secreta debe coincidir con la usada para firmar
            secretOrKey: process.env.JWT_SECRET || 'secretKey',
        });
    }

    /**
     * Callback de validación. Retorna el objeto usuario adjunto a la petición.
     */
    async validate(payload: any) {
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
