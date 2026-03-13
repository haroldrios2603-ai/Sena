import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { PasswordRequestDto } from './dto/password-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { AuditService } from '../audit/audit.service';
import { AuditOperation, AuditResult } from '@prisma/client';

/**
 * Controlador para manejar peticiones de autenticación.
 * Expone endpoints para Registro e Inicio de Sesión.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

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
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: { ip?: string; headers?: Record<string, unknown>; originalUrl?: string; method?: string; _auditStartMs?: number },
  ) {
    try {
      const result = await this.authService.login(loginDto);
      const decoded = this.authService.validateToken(result.accessToken) as {
        sub?: string;
        email?: string;
      };

      this.auditService.log({
        operation: AuditOperation.LOGIN,
        entity: 'auth',
        result: AuditResult.SUCCESS,
        newValues: { email: loginDto.email },
        context: this.auditService.buildContextFromRequest(req as any, {
          userId: decoded.sub,
          userEmail: decoded.email ?? loginDto.email,
        }),
      });

      return result;
    } catch (error) {
      this.auditService.log({
        operation: AuditOperation.LOGIN_FAILED,
        entity: 'auth',
        result: AuditResult.FAILURE,
        errorCode: error instanceof UnauthorizedException ? '401' : '400',
        errorMessage: (error as Error).message,
        newValues: { email: loginDto.email },
        context: this.auditService.buildContextFromRequest(req as any, {
          userEmail: loginDto.email,
        }),
      });

      throw error;
    }
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
    const result = await this.authService.logout(req.user.userId);

    this.auditService.log({
      operation: AuditOperation.LOGOUT,
      entity: 'auth',
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req as any),
    });

    return result;
  }

  /**
   * Endpoint público para solicitar código de recuperación.
   */
  @Post('password/request')
  async requestPassword(@Body() passwordRequestDto: PasswordRequestDto) {
    const result = await this.authService.requestPasswordReset(passwordRequestDto);

    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'password_reset_request',
      result: AuditResult.SUCCESS,
      newValues: { email: passwordRequestDto.email },
    });

    return result;
  }

  /**
   * Endpoint público para confirmar código y registrar nueva contraseña.
   */
  @Post('password/reset')
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    const result = await this.authService.confirmPasswordReset(passwordResetDto);

    this.auditService.log({
      operation: AuditOperation.PASSWORD_CHANGE,
      entity: 'auth',
      result: AuditResult.SUCCESS,
      newValues: { email: passwordResetDto.email },
    });

    return result;
  }
}
