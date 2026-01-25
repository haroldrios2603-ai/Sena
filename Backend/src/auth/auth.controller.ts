import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

/**
 * Controlador para manejar peticiones de autenticación.
 * Expone endpoints para Registro e Inicio de Sesión.
 */
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * Endpoint para registrar un nuevo usuario.
     */
    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    /**
     * Endpoint para iniciar sesión.
     */
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    /**
     * Endpoint protegido para obtener perfil actual.
     * Requiere Token Bearer.
     */
    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
