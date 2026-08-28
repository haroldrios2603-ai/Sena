/**
 * Punto de entrada del servidor NestJS. Inicializa la aplicación.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: Request & { _auditStartMs?: number }, _res: Response, next: NextFunction) => {
    req._auditStartMs = Date.now();
    next();
  });

  // Habilitar validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remover propiedades no decoradas
      forbidNonWhitelisted: true, // Lanzar error si hay propiedades no permitidas
      transform: true, // Transformar payloads a instancias de DTO
    }),
  );

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? allowedOrigins.length > 0
          ? allowedOrigins
          : ['http://localhost:5173']
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-WOMPI-SIGNATURE'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
  });

  // Usar filtro global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('RM Parking API')
    .setDescription('API documentation for RM Parking management system')
    .setVersion('1.0')
    .addTag('parking')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
