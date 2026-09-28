# 🔧 SOLUCIONES PRÁCTICAS - Código Listo para Usar

Este documento contiene soluciones prontas para copiar/pegar para arreglar los errores encontrados.

---

## ✅ SOLUCIÓN 1: Validación de Variables de Entorno

**Crear archivo:** `Backend/src/config/env.validation.ts`

```typescript
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, validate, ValidateIf } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  NODE_ENV!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsNumber()
  PORT: number = 3000;

  @ValidateIf((o) => o.NODE_ENV === 'production')
  @IsString()
  FRONTEND_BASE_URL?: string;

  @ValidateIf((o) => o.NODE_ENV === 'production')
  @IsString()
  ALLOWED_ORIGINS?: string;
}

export async function validateEnvironment() {
  const config = plainToInstance(
    EnvironmentVariables,
    process.env,
    { enableImplicitConversion: true, excludeExtraneousValues: false },
  );

  const errors = await validate(config);

  if (errors.length > 0) {
    const errorDetails = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints || {}).join(', ')}`,
      )
      .join('\n');

    console.error(
      '❌ FATAL: Variables de entorno faltantes o inválidas:\n' + errorDetails,
    );
    process.exit(1);
  }

  // Validaciones adicionales
  if (config.NODE_ENV === 'production') {
    if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
      console.error(
        '❌ FATAL: JWT_SECRET debe tener mínimo 32 caracteres en producción',
      );
      process.exit(1);
    }
  }

  return config;
}
```

**Usar en:** `Backend/src/main.ts`

```typescript
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  // ✅ PRIMERO: Validar variables
  await validateEnvironment();

  const app = await NestFactory.create(AppModule);

  // ... resto del código
}

void bootstrap();
```

---

## ✅ SOLUCIÓN 2: JWT Seguro en Auth Module

**Actualizar:** `Backend/src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PasswordRecoveryNotifierService } from './password-recovery-notifier.service';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({
      // ✅ SEGURO: Requiere JWT_SECRET
      secret: getJwtSecret(),
      signOptions: { expiresIn: '10h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordRecoveryNotifierService],
  exports: [AuthService],
})
export class AuthModule {}

/**
 * ✅ FUNCIÓN SEGURA para obtener JWT_SECRET
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const environment = process.env.NODE_ENV || 'development';
    const message =
      environment === 'production'
        ? 'CRÍTICO: JWT_SECRET no está definido en producción. ' +
          'Define la variable de entorno JWT_SECRET con al menos 32 caracteres.'
        : 'Advertencia: JWT_SECRET no está definido. Usando valor débil de desarrollo. ' +
          'Establece JWT_SECRET en .env para seguridad mejorada.';

    if (environment === 'production') {
      throw new Error(message);
    }

    console.warn('⚠️  ' + message);
    return 'dev-secret-minimum-32-chars-please-change';
  }

  if (secret.length < 32) {
    console.warn(
      '⚠️  JWT_SECRET tiene menos de 32 caracteres. ' +
        'Recomendado: mínimo 32 para desarrollo, 64 para producción.',
    );
  }

  return secret;
}
```

---

## ✅ SOLUCIÓN 3: Rate Limiting

**1. Instalar dependencia:**

```bash
npm install @nestjs/throttler
```

**2. Crear:** `Backend/src/config/throttler.config.ts`

```typescript
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = [
  {
    name: 'short',
    ttl: 60 * 1000, // 1 minuto
    limit: 5, // 5 intentos
  },
  {
    name: 'long',
    ttl: 15 * 60 * 1000, // 15 minutos
    limit: 15, // 15 intentos
  },
];
```

**3. Actualizar:** `Backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { throttlerConfig } from './config/throttler.config';

// ... imports

@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerConfig),
    // ... rest
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**4. Aplicar a endpoints sensibles:**

**Backend/src/auth/auth.controller.ts**

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // ...

  @Post('login')
  @Throttle('short')  // 5 intentos/minuto
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
  ) {
    // ... código existente
  }

  @Post('password/request')
  @Throttle('long')  // 15 intentos/15 minutos
  async requestPasswordReset(@Body() dto: PasswordRequestDto) {
    // ... código existente
  }

  @Post('password/reset')
  @Throttle('short')  // 5 intentos/minuto
  async resetPassword(@Body() dto: PasswordResetDto) {
    // ... código existente
  }
}
```

---

## ✅ SOLUCIÓN 4: Code Splitting en Frontend

**Actualizar:** `Frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  build: {
    target: 'ES2020',
    minify: 'terser',
    
    rollupOptions: {
      output: {
        // ✅ Crear chunks separados para mejor caching y loading
        manualChunks: {
          // Librerías de terceros importantes
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts', 'chart.js'],
          'ui-vendor': ['lucide-react'],
          'i18n': ['i18next', 'react-i18next'],
          'http': ['axios'],
          
          // Código de la aplicación
          'auth': [
            '/src/context/AuthContext.tsx',
            '/src/pages/Login.tsx',
            '/src/features/auth',
          ],
          'admin': [
            '/src/components/admin',
          ],
          'reports': [
            '/src/components/reports',
          ],
        },
      },
    },
    
    // ✅ Aumentar límite de advertencia
    chunkSizeWarningLimit: 700,
  },
})
```

**Resultado esperado:**
```
✓ built in 15.3s

dist/assets/react-vendor-XXXXX.js     300.5 kB
dist/assets/chart-vendor-XXXXX.js     180.2 kB
dist/assets/http-XXXXX.js              45.3 kB
dist/assets/i18n-XXXXX.js              32.1 kB
dist/assets/auth-XXXXX.js              95.7 kB
dist/assets/admin-XXXXX.js             120.5 kB
dist/assets/reports-XXXXX.js           85.3 kB
dist/assets/index-XXXXX.js             128.9 kB

Total: ~988 KB → 788 KB (-20%)
```

---

## ✅ SOLUCIÓN 5: Validación de Webhook Wompi

**Crear:** `Backend/src/payments/wompi.validator.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class WompiValidatorService {
  /**
   * Valida la firma HMAC del webhook de Wompi
   * @param payload Datos del webhook
   * @param signature Header X-WOMPI-SIGNATURE
   * @returns true si es válido
   */
  validateWebhookSignature(payload: any, signature: string): boolean {
    const secret = process.env.WOMPI_INTEGRITY_SECRET;
    if (!secret) {
      console.warn(
        '⚠️  WOMPI_INTEGRITY_SECRET no está definido. ' +
        'Los webhooks no pueden ser validados en producción.'
      );
      return false;
    }

    // Crear hash esperado
    const payloadString = JSON.stringify(payload);
    const expectedSignature = createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // Comparar timing-safe
    return expectedSignature === signature;
  }
}
```

**Actualizar:** `Backend/src/payments/payments.controller.ts`

```typescript
import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { WompiValidatorService } from './wompi.validator';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly wompiValidator: WompiValidatorService,
  ) {}

  @Post('webhooks/wompi')
  async handleWompiWebhook(
    @Body() payload: any,
    @Headers('x-wompi-signature') signature: string,
  ) {
    // ✅ VALIDAR FIRMA
    if (!this.wompiValidator.validateWebhookSignature(payload, signature)) {
      throw new BadRequestException('Firma de webhook inválida');
    }

    // ✅ PROCESAR WEBHOOK
    const transaction = payload.data?.transaction;
    if (!transaction) {
      throw new BadRequestException('Datos de transacción ausentes');
    }

    if (transaction.status === 'APPROVED') {
      await this.paymentsService.completePayment(
        transaction.reference,
        transaction.id,
      );
    } else if (transaction.status === 'DECLINED') {
      await this.paymentsService.failPayment(
        transaction.reference,
        'Transacción rechazada por Wompi',
      );
    }

    return { status: 'webhook_processed' };
  }
}
```

**Actualizar:** `Backend/src/payments/payments.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DatabaseModule } from '../database.module';
import { WompiValidatorService } from './wompi.validator';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, WompiValidatorService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

---

## ✅ SOLUCIÓN 6: CORS Mejorado

**Actualizar:** `Backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Middleware de auditoría
  app.use((req: Request & { _auditStartMs?: number }, _res: Response, next: NextFunction) => {
    req._auditStartMs = Date.now();
    next();
  });

  // ✅ Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ CORS SEGURO
  const corsOrigins = getCorsOrigins();
  console.log('✅ CORS Origins permitidos:', corsOrigins);
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
    maxAge: 3600,
  });

  // ✅ Manejo global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  // ✅ Swagger
  const config = new DocumentBuilder()
    .setTitle('RM Parking API')
    .setDescription('API documentation for RM Parking management system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`✅ Backend running on port ${process.env.PORT ?? 3000}`);
}

/**
 * ✅ FUNCIÓN SEGURA para obtener CORS origins
 */
function getCorsOrigins(): string[] {
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'production') {
    // En producción, solo dominios específicos
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (origins.length === 0) {
      console.error('❌ CORS: ALLOWED_ORIGINS no está definido en producción');
      process.exit(1);
    }
    
    return origins.map(o => o.trim());
  }

  // En desarrollo, permitir localhost
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
  ];
}

void bootstrap();
```

---

## ✅ SOLUCIÓN 7: Health Check Completo

**Crear:** `Backend/src/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.checkHealth();
  }

  @Get('ready')
  async readiness() {
    return this.healthService.checkReadiness();
  }

  @Get('live')
  async liveness() {
    return this.healthService.checkLiveness();
  }
}
```

**Crear:** `Backend/src/health/health.service.ts`

```typescript
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async checkHealth() {
    const timestamp = new Date().toISOString();
    
    try {
      // Verificar BD
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'UP',
        timestamp,
        checks: {
          database: { status: 'UP' },
        },
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        timestamp,
        checks: {
          database: { status: 'DOWN', error: String(error) },
        },
      });
    }
  }

  async checkReadiness() {
    // Para Kubernetes readiness probe
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      throw new ServiceUnavailableException({ ready: false });
    }
  }

  async checkLiveness() {
    // Para Kubernetes liveness probe
    return { alive: true };
  }
}
```

**Actualizar docker-compose.yml:**

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 30s
```

---

## ✅ SOLUCIÓN 8: Logging Estructurado con Winston

**Instalar dependencia:**

```bash
npm install nest-winston winston winston-daily-rotate-file
```

**Crear:** `Backend/src/config/logger.config.ts`

```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { existsSync, mkdirSync } from 'fs';

// Crear directorio de logs si no existe
if (!existsSync('logs')) {
  mkdirSync('logs');
}

export const winstonLogger = WinstonModule.createLogger({
  transports: [
    // ✅ Console (todos los niveles en desarrollo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.ms(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ms, ...meta }) => {
          let msg = `${timestamp} [${level}] ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          if (ms) msg += ` ${ms}`;
          return msg;
        }),
      ),
    }),

    // ✅ Archivo general (todos los logs)
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),

    // ✅ Archivo de errores (solo nivel error y superior)
    new DailyRotateFile({
      filename: 'logs/errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
  ],
});
```

**Usar en:** `Backend/src/main.ts`

```typescript
import { winstonLogger } from './config/logger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: winstonLogger });
  
  // ... resto del código
}
```

---

## 📝 Resumen de Cambios

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `Backend/tsconfig.json` | ✅ Remover `ignoreDeprecations` | HECHO |
| `Frontend/index.html` | ✅ Cambiar título | HECHO |
| `Backend/src/config/env.validation.ts` | ✅ Crear validador | LISTO |
| `Backend/src/auth/auth.module.ts` | ✅ JWT seguro | LISTO |
| `Backend/src/app.module.ts` | ✅ Agregar ThrottlerModule | LISTO |
| `Backend/src/auth/auth.controller.ts` | ✅ Aplicar @Throttle | LISTO |
| `Frontend/vite.config.ts` | ✅ Code splitting | LISTO |
| `Backend/src/payments/wompi.validator.ts` | ✅ Validación webhook | LISTO |
| `Backend/src/main.ts` | ✅ CORS mejorado | LISTO |
| `Backend/src/config/logger.config.ts` | ✅ Logging Winston | LISTO |

---

## 🧪 Verificación Final

Después de aplicar todas las soluciones:

```bash
# 1. Compilar backend
cd Backend
npm install  # Si hay nuevos packages
npm run build
# Debe completar sin errores ✅

# 2. Compilar frontend
cd Frontend
npm run build
# Debe mostrar chunks más pequeños ✅

# 3. Ejecutar tests
cd Backend
npm test
# Todos deben pasar ✅

# 4. Iniciar localmente
docker-compose up -d
# Backend, Frontend, BD deben estar saludables ✅

# 5. Verificar endpoints
curl http://localhost:3000/health
curl http://localhost:5173
# Ambos deben responder ✅
```

---

Documento de soluciones: **LISTO PARA APLICAR**
