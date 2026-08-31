/**
 * Controlador que maneja rutas HTTP relacionadas con src.
 */
import { Controller, Get, Header, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';

// Controlador principal de la aplicación.
// Define rutas HTTP de nivel superior usadas para comprobaciones básicas.
@Controller()
export class AppController {
  // Inyección del servicio principal de la aplicación.
  // `AppService` contiene la lógica de negocio reutilizable por el controlador.
  constructor(private readonly appService: AppService) {}

  // Maneja peticiones GET a la raíz ('/').
  // Devuelve un saludo o mensaje de estado simple obtenido desde `AppService`.
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ES: responde de forma silenciosa para evitar el 404 repetido de /favicon.ico
  // cuando el navegador intenta cargar el icono de la pestaña.
  @Get('favicon.ico')
  @Header('Content-Type', 'image/x-icon')
  getFavicon(@Res() res: Response) {
    return res.status(204).end();
  }
}
