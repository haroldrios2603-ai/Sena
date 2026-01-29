# TICKET: Registro de Salida y Cobro
**ID:** SPRINT1-CORE-002
**Rol:** Backend + Frontend
**Sprint:** 1

## Descripción
Implementar el flujo de salida. Al ingresar la placa o código de ticket, el sistema calcula el tiempo transcurrido y el valor a cobrar basándose en las tarifas configuradas.

## Criterios de Aceptación
- [ ] Endpoint `POST /parking/exit` calcula duración y monto.
- [ ] Lógica de tarificación aplicada (Carro vs Moto).
- [ ] Frontend muestra resumen de cobro y confirma salida.
