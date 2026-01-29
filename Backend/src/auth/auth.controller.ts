import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
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
  constructor(private authService: AuthService) {}

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
   * Endpoint protegido para obtener el perfil completo del usuario.
   * ES: Consulta BD y retorna campos completos esperados por el Frontend.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req: { user: { userId: string } }) {
    return this.authService.getProfile(req.user.userId);
  }

  /**
   * Endpoint protegido para cerrar sesión y registrar checkOut de asistencia.
   * ES: Actualiza el último registro de asistencia sin cerrar.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Request() req: { user: { userId: string } }) {
    return this.authService.logout(req.user.userId);
  }
}
