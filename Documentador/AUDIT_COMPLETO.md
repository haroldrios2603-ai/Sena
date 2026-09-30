# 🔍 AUDITORÍA EXHAUSTIVA - Proyecto RM Parking
**Fecha:** 30 de abril de 2026  
**Estado:** Revisión Completa Realizada  
**Versión del Proyecto:** Sprint 1 Completado

---

## 📋 TABLA DE CONTENIDOS
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Errores Críticos Encontrados](#errores-críticos-encontrados)
3. [Errores Altos - Antes de Producción](#errores-altos---antes-de-producción)
4. [Problemas Moderados](#problemas-moderados)
5. [Plan de Solución Paso a Paso](#plan-de-solución-paso-a-paso)
6. [Guía de Deployment a Producción](#guía-de-deployment-a-producción)
7. [Checklist Final](#checklist-final)

---

## 📊 RESUMEN EJECUTIVO

### Estado General: ⚠️ NO LISTO PARA PRODUCCIÓN

El proyecto RM Parking es funcional y bien estructurado, pero requiere correcciones **críticas** en seguridad y compilación antes de cualquier deployment:

| Área | Estatus | Urgencia |
|------|---------|----------|
| Código Backend | ❌ No compila | CRÍTICA |
| Seguridad | ❌ Credenciales expuestas | CRÍTICA |
| Frontend | ✅ Compila correctamente | - |
| Arquitectura | ✅ Bien estructurada | - |
| Testing | ⚠️ Parcial | ALTA |
| Documentation | ✅ Completa | - |

### Métricas del Proyecto

```
Backend:
  - Líneas de código: ~5,000+
  - Módulos: 9 (auth, parking, users, clients, payments, audit, reports, settings, permissions)
  - Dependencias: 24 packages + 28 dev
  - Testing: Jest configurado

Frontend:
  - Líneas de código: ~3,500+
  - Componentes: 15+ principales
  - Bundle size: 875.95 KB (⚠️ Supera límite)
  - Testing: Playwright (E2E básico)

Base de Datos:
  - Motor: PostgreSQL 15
  - ORM: Prisma 5.22.0
  - Tablas: 13+ modelos
  - Relaciones: Bien definidas
```

---

## 🔴 ERRORES CRÍTICOS ENCONTRADOS

### ERROR 1: Backend No Compila (TypeScript Configuration)

**Severidad:** 🔴 CRÍTICA - BLOQUEA TODO  
**Archivo:** `Backend/tsconfig.json`  
**Problema:**
```typescript
// ❌ PROBLEMA: Opción inválida en TypeScript 5.9.3
"ignoreDeprecations": "6.0"
```

**Error exacto:**
```
error TS5103: Invalid value for '--ignoreDeprecations'.
```

**Causa Root:** TypeScript 5.9.3 no soporta esta opción. La línea fue agregada probablemente para versiones antigas.

**Solución:**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    // ❌ REMOVER esta línea:
    // "ignoreDeprecations": "6.0",
    
    // Resto de configuración...
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist"
  }
}
```

**Verificación:**
```bash
cd Backend
npm run build
# Debería completar sin errores
```

---

### ERROR 2: Credenciales de Producción Expuestas en Repositorio

**Severidad:** 🔴 CRÍTICA - RIESGO DE SEGURIDAD  
**Archivos:** `Backend/.env`, `Sena/.env`  
**Problema:**
```env
# Backend/.env CONTIENE:
SMTP_PASS=svefqwkhrxoeygcy  # ⚠️ CONTRASEÑA EXPUESTA
SMTP_USER=haroldrios2603@gmail.com  # ⚠️ EMAIL EXPUESTO
JWT_SECRET=mi-super-secret-key-desarrollo  # ⚠️ SECRETO EXPUESTO
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rmparking  # ⚠️ CREDENCIALES
```

**Riesgos:**
- ✉️ Cualquiera con acceso al repo puede enviar emails desde SMTP
- 🔐 Tokens JWT pueden ser falsificados
- 🗄️ Base de datos puede ser accedida/modificada
- 📧 Privacidad violada (email personal expuesto)

**Estado en Git:** 
✓ Los archivos están en `.gitignore` (BIEN)  
❌ Pero ya fueron creados localmente (RIESGO LOCAL)

**Soluciones Inmediatas:**
1. **Cambiar contraseña SMTP ahora:**
   - Ir a [Google Account Security](https://myaccount.google.com/security)
   - Cambiar contraseña de aplicación (si no lo está)
   - Generar nueva contraseña de aplicación si es posible

2. **Remover archivos .env de control:**
   ```bash
   git rm --cached Backend/.env Sena/.env
   # Verificar que esté en .gitignore
   cat .gitignore  # Debe contener ".env"
   ```

3. **Verificar que no fueron pushed a remoto:**
   ```bash
   git log --all -- Backend/.env
   # Si muestra commits, fueron pusheados
   ```

4. **Si fueron pusheados a GitHub:**
   - Cambiar TODOS los secretos (SMTP, JWT, DB passwords)
   - Hacer force push o usar GitHub secret scanning

5. **Estructura recomendada:**
   ```
   Backend/
   ├── .env                    # ❌ IGNORADO (NO SUBIR)
   ├── .env.example            # ✅ SUBIR (sin valores sensibles)
   ├── .env.production.example # ✅ SUBIR (template para prod)
   └── .env.local             # ❌ IGNORADO (desarrollo local)
   ```

---

### ERROR 3: Secreto JWT por Defecto en Producción

**Severidad:** 🔴 CRÍTICA - SEGURIDAD  
**Archivo:** `Backend/src/auth/auth.module.ts`  
**Problema:**
```typescript
// ❌ PROBLEMA: Si JWT_SECRET no está definido en producción
JwtModule.register({
  secret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'development' 
      ? 'dev-secret'  // ❌ Débil incluso para dev
      : undefined),   // ❌ undefined falla silenciosamente
  signOptions: { expiresIn: '10h' },
})
```

**Riesgo:** Si `JWT_SECRET` no se define en producción, `undefined` será usado y NestJS fallará.

**Solución:**
```typescript
// ✅ CORRECTO:
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error(
    'CRÍTICO: JWT_SECRET no está definido. ' +
    'Defina la variable de entorno JWT_SECRET con un valor de al menos 32 caracteres.'
  );
}

JwtModule.register({
  secret: jwtSecret || 'dev-secret-32-chars-minimum-length', // ✅ Mínimo 32 chars
  signOptions: { expiresIn: '10h' },
})
```

---

## 🟠 ERRORES ALTOS - ANTES DE PRODUCCIÓN

### ERROR 4: Bundle Frontend Muy Grande

**Severidad:** 🟠 ALTA - Afecta performance  
**Síntoma:** Advertencia durante build:
```
(!) Some chunks are larger than 500 kB after minification.
dist/assets/index-Cj6Z60hu.js 875.95 kB (gzip: 257.05 kB)
```

**Impacto:**
- Tiempo de carga inicial: ~5-8 segundos
- Uso de datos: +200MB/mes por 100 usuarios activos
- UX degradada en conexiones lentas

**Causa Root:** Axios, React Router, Recharts, i18next bundleados sin code-splitting.

**Solución - Implementar Code Splitting:**

**Archivo:** `Frontend/vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  build: {
    rollupOptions: {
      output: {
        // ✅ Crear chunks separados por dependencia
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['recharts', 'lucide-react'],
          'i18n': ['i18next', 'react-i18next'],
          'http': ['axios'],
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
```

**Resultado esperado:** 
- `vendor.js`: ~300KB
- `ui.js`: ~200KB  
- `i18n.js`: ~50KB
- `main.js`: ~150KB
- Total: ~700KB (reducción del 20%)

---

### ERROR 5: Falta Validación de Webhook Wompi

**Severidad:** 🟠 ALTA - Seguridad de pagos  
**Archivo:** `Backend/src/payments/payments.service.ts`  
**Problema:** Documentado en `Documentador/PROJECT_BRIEF.md`:
```
- Pendiente de configuración final: claves sandbox reales 
  y validación de firma de webhook para endurecimiento de seguridad.
```

**Riesgo:** Webhooks falsificados pueden registrar pagos fraudulentos.

**Implementación Requerida:**

```typescript
// En payments.service.ts, agregar validación:
import { createHmac } from 'crypto';

async handleWompiWebhook(
  payload: WompiWebhookPayload,
  signature: string // Header: X-WOMPI-SIGNATURE
): Promise<void> {
  // ✅ Validar firma
  const expectedSignature = createHmac('sha256', process.env.WOMPI_INTEGRITY_SECRET!)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    throw new UnauthorizedException('Firma de webhook inválida');
  }
  
  // Proceder con procesamiento
  const transaction = payload.data?.transaction;
  if (transaction?.status === 'APPROVED') {
    await this.completePayment(transaction.reference);
  }
}
```

---

### ERROR 6: Sin Rate Limiting en Endpoints Sensibles

**Severidad:** 🟠 ALTA - Seguridad  
**Endpoints Vulnerables:**
- `POST /auth/login` - Fuerza bruta de contraseñas
- `POST /auth/password/request` - Enumeración de usuarios
- `POST /auth/password/reset` - Brute force de códigos (4 dígitos = 10k combinaciones)

**Solución:**

**Instalar dependencia:**
```bash
npm install @nestjs/throttler
```

**Backend/src/main.ts:**
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

async function bootstrap() {
  // ... existing code ...
  
  app.useGlobalGuards(new ThrottlerGuard());
  
  // Resto de configuración...
}
```

**Backend/src/app.module.ts:**
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,      // 60 segundos
        limit: 5,        // 5 intentos
      },
    ]),
    // ... resto de módulos ...
  ],
})
export class AppModule {}
```

**Aplicar a endpoints específicos:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 intentos/minuto
async login(@Body() loginDto: LoginDto) {
  // ...
}

@Post('password/request')
@Throttle({ default: { limit: 3, ttl: 300000 } })  // 3 intentos/5min
async requestPasswordReset(@Body() dto: PasswordRequestDto) {
  // ...
}
```

---

### ERROR 7: HTML Title Incorrecto

**Severidad:** 🟠 ALTA - UX/SEO  
**Archivo:** `Frontend/index.html`  
**Problema:**
```html
<!-- ❌ ACTUAL -->
<title>frontend</title>

<!-- ✅ CORRECTO -->
<title>RM Parking - Sistema de Gestión de Estacionamientos</title>
```

**Impacto:**
- SEO negativo
- Tab del navegador poco profesional
- Confusión de usuarios con múltiples tabs

---

## 🟡 PROBLEMAS MODERADOS

### PROBLEMA 8: Sin HTTPS Forzado

**Severidad:** 🟡 MODERADA  
**Contexto:** Docker compose corre en HTTP puro.

**Solución para Producción (AWS/Docker con Nginx):**

**Crear archivo:** `nginx.conf`
```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;  # Redirigir HTTP→HTTPS
}

server {
    listen 443 ssl http2;
    server_name rmparking.example.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Backend proxy
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Frontend
    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
    }
}
```

---

### PROBLEMA 9: CORS Muy Permisivo

**Severidad:** 🟡 MODERADA  
**Archivo:** `Backend/src/main.ts`  
**Problema:**
```typescript
// ❌ En producción permite localhost:3000 también
app.enableCors({
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
      : ['http://localhost:5173', 'http://localhost:3000'],  // ❌ Muy permisivo
  credentials: true,
});
```

**Solución:**
```typescript
// ✅ CORRECTO
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

if (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173');
}

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Variables de entorno:**
```env
# .env (desarrollo)
ALLOWED_ORIGINS=http://localhost:5173

# .env.production
ALLOWED_ORIGINS=https://rmparking.example.com,https://admin.rmparking.example.com
```

---

### PROBLEMA 10: Sin Validación de Variables en Startup

**Severidad:** 🟡 MODERADA  
**Problema:** Si variables críticas faltan, fallan silenciosamente.

**Solución - Crear validador:**

**Backend/src/env.validation.ts:**
```typescript
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, validate } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  JWT_SECRET!: string;

  @IsString()
  NODE_ENV!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsNumber()
  PORT!: number;
}

export async function validateEnvironment() {
  const config = plainToInstance(
    EnvironmentVariables,
    process.env,
    { enableImplicitConversion: true },
  );

  const errors = await validate(config);

  if (errors.length > 0) {
    const missing = errors
      .map(e => `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`)
      .join('\n');
    
    throw new Error(
      `❌ Variables de entorno faltantes o inválidas:\n${missing}`
    );
  }

  return config;
}
```

**Backend/src/main.ts:**
```typescript
import { validateEnvironment } from './env.validation';

async function bootstrap() {
  // ✅ Validar env en primer lugar
  await validateEnvironment();
  
  const app = await NestFactory.create(AppModule);
  // ... resto
}
```

---

### PROBLEMA 11: Sin Health Check en Frontend Container

**Severidad:** 🟡 MODERADA  
**Archivo:** `docker-compose.yml`  
**Problema:** Vite devserver no tiene healthcheck.

**Solución:**
```yaml
services:
  frontend:
    build:
      context: ./Frontend
      dockerfile: Dockerfile
    container_name: rmparking-frontend
    restart: unless-stopped
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=${VITE_API_URL:-http://localhost:3000}
      - CHOKIDAR_USEPOLLING=1
    networks:
      - rmparking-net
    healthcheck:  # ✅ AGREGAR
      test: [ "CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5173" ]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    volumes:
      - ./Frontend/src:/app/src
      - ./Frontend/public:/app/public
    depends_on:
      db:
        condition: service_healthy
```

---

### PROBLEMA 12: Sin Logging Estructurado

**Severidad:** 🟡 MODERADA  
**Problema:** Logs van solo a stdout, sin persistencia ni estructura.

**Solución - Implementar Winston:**

**Backend/package.json:**
```json
{
  "dependencies": {
    "nest-winston": "^1.9.5",
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1"
  }
}
```

**Backend/src/logger.ts:**
```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export const logger = WinstonModule.createLogger({
  transports: [
    // ✅ Console (desarrollo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    
    // ✅ Archivos rotativos (producción)
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    
    // ✅ Errores en archivo separado
    new DailyRotateFile({
      filename: 'logs/errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});
```

---

## 🟢 PROBLEMAS BAJOS - OPTIMIZACIONES

### PROBLEMA 13: Falta .env.production.example

Crear archivo: `Backend/.env.production.example`
```env
# 🔐 PRODUCCIÓN - Valores de ejemplo
PORT=3000
NODE_ENV=production

# ⚠️ DEBE CAMBIARSE EN PRODUCCIÓN
JWT_SECRET=generate-secure-random-32-chars-min

# Base de datos (usar RDS/Cloud managed)
DATABASE_URL=postgresql://user:pass@db.example.com:5432/rmparking

# SMTP (usar SendGrid, AWS SES, etc)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@rmparking.com

# CORS (dominios reales)
ALLOWED_ORIGINS=https://rmparking.example.com

# Wompi (claves de producción)
WOMPI_PUBLIC_KEY=pub_prod_xxxxx
WOMPI_INTEGRITY_SECRET=prod_integrity_xxxxx
WOMPI_CHECKOUT_BASE_URL=https://checkout.wompi.co/p/

# Frontend
VITE_API_URL=https://api.rmparking.example.com
FRONTEND_BASE_URL=https://rmparking.example.com
```

---

## 📋 PLAN DE SOLUCIÓN PASO A PASO

### ✅ Paso 1: Arreglar Compilación (30 min)

1. Abrir `Backend/tsconfig.json`
2. Remover línea: `"ignoreDeprecations": "6.0"`
3. Guardar
4. Ejecutar: `cd Backend && npm run build`
5. Verificar: Sin errores

### ✅ Paso 2: Validación de Secretos (15 min)

1. Verificar que `.env` esté en `.gitignore`:
   ```bash
   grep -n "\.env" .gitignore
   ```
2. Si no está, agregar:
   ```bash
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   ```

### ✅ Paso 3: Implementar Validación de Variables (45 min)

1. Crear `Backend/src/env.validation.ts` (copiar código anterior)
2. Importar en `Backend/src/main.ts`
3. Ejecutar validación en bootstrap
4. Testear con `npm run build`

### ✅ Paso 4: Agregar Rate Limiting (45 min)

1. `npm install @nestjs/throttler`
2. Importar en `app.module.ts`
3. Aplicar a endpoints sensibles
4. Testear con curl/Postman

### ✅ Paso 5: Implementar Code Splitting (30 min)

1. Actualizar `Frontend/vite.config.ts` (copiar anterior)
2. Ejecutar: `cd Frontend && npm run build`
3. Verificar tamaños de chunks: `npm run build -- --report`

### ✅ Paso 6: Validar Webhook Wompi (60 min)

1. Crear función de validación en `payments.service.ts`
2. Aplicar HMAC validation
3. Testear con webhooks de prueba

### ✅ Paso 7: Corregir HTML Title (5 min)

1. Abrir `Frontend/index.html`
2. Cambiar `<title>frontend</title>` a `<title>RM Parking - Sistema de Gestión de Estacionamientos</title>`
3. Guardar

### ✅ Paso 8: JWT Secret Seguro (15 min)

1. Actualizar `Backend/src/auth/auth.module.ts`
2. Agregar validación según código anterior
3. Regenerar JWT_SECRET seguro (32+ caracteres)

---

## 📦 GUÍA DE DEPLOYMENT A PRODUCCIÓN

### Pre-Deployment Checklist

#### 1. Preparar Infraestructura

**Opción A: AWS EC2 + RDS**
```bash
# Crear instancia EC2 (t3.medium recomendado)
# Crear RDS PostgreSQL 15 (db.t3.small)
# Asignar security groups correctos
# Configurar dominio en Route53
# Solicitar certificado SSL en ACM
```

**Opción B: Docker en AWS ECS**
```bash
# Crear ECR repositories:
# - rmparking-backend
# - rmparking-frontend

# Crear RDS PostgreSQL
# Crear Load Balancer ALB
# Crear ECS Cluster + Task Definitions
```

**Opción C: Heroku (Rápido pero Limitado)**
```bash
heroku create rmparking-prod
heroku addons:create heroku-postgresql:standard-0
# Limitado a 550h/mes sin costo adicional
```

#### 2. Preparar Variables de Entorno Producción

Crear `.env.production.local` (NUNCA subir):
```env
# Base de datos (RDS endpoint)
DATABASE_URL=postgresql://admin:RandomPass123@rmparking-db.xxxxx.amazonaws.com:5432/rmparking_prod

# JWT Secret (mínimo 64 caracteres aleatorios)
JWT_SECRET=$(openssl rand -base64 48)  # Generar así

# SMTP (recomendado AWS SES)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=xxxxx
SMTP_PASS=xxxxx
SMTP_FROM=noreply@rmparking.example.com

# Wompi Production Keys
WOMPI_PUBLIC_KEY=pub_prod_xxxxx
WOMPI_INTEGRITY_SECRET=prod_integrity_xxxxx

# Dominios
FRONTEND_BASE_URL=https://rmparking.example.com
VITE_API_URL=https://api.rmparking.example.com
ALLOWED_ORIGINS=https://rmparking.example.com

# Node
NODE_ENV=production
PORT=3000
```

#### 3. Build para Producción

```bash
# Backend
cd Backend
npm install --production
npm run build
docker build -t rmparking-backend:1.0.0 .

# Frontend
cd Frontend
npm install --production
npm run build
docker build -t rmparking-frontend:1.0.0 .
```

#### 4. Configurar Docker Compose para Producción

**Crear:** `docker-compose.prod.yml`
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rmparking_prod
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    restart: always
    networks:
      - rmparking-net

  backend:
    image: rmparking-backend:1.0.0
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/rmparking_prod
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
      # ... resto de variables
    restart: always
    depends_on:
      db:
        condition: service_healthy
    networks:
      - rmparking-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/docs"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: rmparking-frontend:1.0.0
    environment:
      VITE_API_URL: https://api.rmparking.example.com
    restart: always
    networks:
      - rmparking-net

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    restart: always
    networks:
      - rmparking-net

volumes:
  postgres_data_prod:

networks:
  rmparking-net:
```

#### 5. Realizar Migraciones de Base de Datos

```bash
# Dentro del contenedor backend
docker-compose exec backend npx prisma migrate deploy

# O con script existente
./ops/prisma_orchestrator.sh migrate
```

#### 6. Verificar Health Checks

```bash
# Backend
curl https://api.rmparking.example.com/api/docs

# Frontend
curl https://rmparking.example.com

# Database
docker-compose exec db pg_isready -U admin
```

#### 7. Configurar Backups

**Backup diario de BD:**
```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/backups/rmparking"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

docker-compose exec db pg_dump -U $POSTGRES_USER rmparking_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Subir a S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://rmparking-backups/
```

**Agregar a cron:**
```bash
# Ejecutar diariamente a las 2am
0 2 * * * /path/to/backup-db.sh
```

#### 8. Configurar Monitoreo

**CloudWatch Logs:**
```bash
# Backend publica logs a CloudWatch
docker run ... \
  --log-driver awslogs \
  --log-opt awslogs-group=/ecs/rmparking-backend \
  --log-opt awslogs-region=us-east-1
```

**Alertas:**
- Health check falló
- Errores HTTP 5xx > 5/min
- Latencia > 2s
- Error rate > 1%

---

## ✅ CHECKLIST FINAL PRE-PRODUCCIÓN

### Código
- [ ] Backend compila sin errores
- [ ] Frontend compila sin errores
- [ ] Tests pasan (backend y E2E)
- [ ] Linting sin warnings
- [ ] No hay console.log en código productivo

### Seguridad
- [ ] JWT_SECRET es seguro (64+ chars)
- [ ] HTTPS/TLS en producción
- [ ] Rate limiting en endpoints sensibles
- [ ] CORS configurado correctamente
- [ ] No hay datos sensibles en logs
- [ ] Webhook Wompi validado
- [ ] SQL injection prevención verificada
- [ ] CSRF tokens en formularios (si aplica)

### Base de Datos
- [ ] Migraciones Prisma aplicadas
- [ ] Seed data cargado (usuarios de prueba modificados)
- [ ] Backups configurados
- [ ] Índices de BD optimizados
- [ ] Connection pooling configurado

### Performance
- [ ] Frontend bundle < 500KB
- [ ] API response < 500ms en 95th percentile
- [ ] Database query < 100ms en 95th percentile
- [ ] Cache headers configurados
- [ ] CDN para assets estáticos (si aplica)

### Infraestructura
- [ ] Reverse proxy (Nginx/HAProxy) configurado
- [ ] Health checks funcionando
- [ ] Auto-scaling configurado
- [ ] Logs centralizados
- [ ] Monitoreo/alertas activo
- [ ] DNS correcto
- [ ] SSL certificate válido

### Documentación
- [ ] README actualizado
- [ ] API docs en Swagger accesible
- [ ] Guía de operaciones
- [ ] Guía de troubleshooting
- [ ] Credenciales compartidas de forma segura

### Testing
- [ ] Load testing realizado (100+ usuarios)
- [ ] Pruebas E2E en ambiente staging
- [ ] Pruebas de recuperación de errores
- [ ] Rollback plan documentado

### Post-Deployment
- [ ] Verificar logs en tiempo real
- [ ] Probar flujo crítico (login → pago → reporte)
- [ ] Verificar integración Wompi
- [ ] Verificar envío de emails
- [ ] Monitorear recursos (CPU, memoria)
- [ ] Primer backup exitoso

---

## 🚀 COMANDOS RÁPIDOS PARA DEPLOYMENT

### 1. Compilar y validar localmente
```bash
# Backend
cd Backend
npm install
npm run lint
npm run build
npm test

# Frontend
cd Frontend
npm install
npm run lint
npm run build
```

### 2. Build Docker local
```bash
docker-compose -f docker-compose.prod.yml build

# Prueba local
docker-compose -f docker-compose.prod.yml up -d
docker-compose logs -f backend
```

### 3. Deploy a servidor
```bash
# Copiar .env.production.local (nunca con git)
scp -i key.pem .env.production.local user@server:/home/app/

# Pull y deploy
ssh -i key.pem user@server << 'EOF'
cd /home/app
git pull origin main
docker-compose -f docker-compose.prod.yml up -d
docker-compose exec backend npx prisma migrate deploy
EOF
```

### 4. Monitorear
```bash
# Ver logs en tiempo real
docker-compose logs -f backend

# Verificar health
curl https://api.rmparking.example.com/api/docs

# Ver estadísticas
docker stats rmparking-backend rmparking-frontend rmparking-db
```

---

## 📞 SOPORTE Y TROUBLESHOOTING

### Backend no inicia
```bash
# 1. Verificar logs
docker-compose logs backend

# 2. Verificar conexión DB
docker-compose exec backend npx prisma db execute --stdin < /dev/null

# 3. Validar variables de entorno
docker-compose exec backend env | grep JWT
```

### Frontend no carga
```bash
# 1. Verificar build
npm run build

# 2. Verificar logs
docker-compose logs frontend

# 3. Verificar conectividad a API
curl http://localhost:3000/api/docs
```

### Performance lenta
```bash
# 1. Analizar bundle
npm run build -- --analyze

# 2. Verificar recursos
docker stats

# 3. Verificar DB queries
# Habilitar logging en Prisma:
DEBUG=prisma:* npm run start
```

---

## 📈 PRÓXIMAS MEJORAS RECOMENDADAS

1. **Sprint 2 Prioridades:**
   - [ ] Implementar caché (Redis)
   - [ ] GraphQL API alternativa
   - [ ] WebSocket para notificaciones
   - [ ] App móvil (React Native)

2. **Seguridad Avanzada:**
   - [ ] 2FA (Two-Factor Authentication)
   - [ ] Biometría
   - [ ] SAML/OAuth2
   - [ ] Audit logs firmados

3. **IA/ML:**
   - [ ] Predicción de ocupación
   - [ ] Detección de anomalías en pagos
   - [ ] Recomendaciones de tarifas

---

**Documento preparado:** 30 de abril de 2026  
**Versión:** 1.0  
**Estado:** Listo para ejecución
