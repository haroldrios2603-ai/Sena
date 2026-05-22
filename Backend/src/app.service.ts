import { Injectable } from '@nestjs/common';

// Servicio principal de la aplicación.
// Provee métodos reutilizables por controladores y otros servicios.
@Injectable()
export class AppService {
  // Devuelve un saludo simple; utilizado para comprobaciones de salud y ejemplos.
  getHello(): string {
    return 'Hello World!';
  }
}
