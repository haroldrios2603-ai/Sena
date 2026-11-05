# Instrucciones permanentes de persistencia de datos para RM Parking

Estas instrucciones son obligatorias para cualquier implementación, corrección, refactorización, migración o cambio de infraestructura en este repositorio.

## Regla principal

Los datos de la aplicación deben conservarse. Antes de modificar modelos Prisma, migraciones, servicios de configuración, usuarios, clientes, contratos, vehículos, tickets, pagos, auditoría o Docker/PostgreSQL, analizar cómo se preservarán los datos actuales y cómo se trasladarán a otro equipo o a producción.

Nunca borrar, reiniciar, sobrescribir o recrear una base de datos sin una solicitud explícita del usuario y sin advertir claramente el impacto.

## Reglas obligatorias

1. Separar siempre:
   - **Estructura:** cambios en `Backend/prisma/schema.prisma` y migraciones versionadas.
   - **Datos demo:** `Backend/prisma/seed.ts`, únicamente para bases nuevas de desarrollo o pruebas.
   - **Datos reales:** respaldos PostgreSQL mediante `ops/database_backup.ps1` y `ops/database_restore.ps1`.

2. Para cambios de estructura:
   - Crear una migración Prisma reversible o segura cuando sea posible.
   - Considerar datos existentes antes de agregar columnas obligatorias, índices únicos, enums o relaciones.
   - Proporcionar valores de transición o una actualización de datos antes de aplicar restricciones `NOT NULL` o `UNIQUE`.
   - Validar con `npx prisma validate`, `npx prisma generate`, `npx prisma migrate deploy` en un entorno de prueba y `npm run build`.
   - Nunca usar `prisma db push --accept-data-loss` como mecanismo normal de producción.

3. Para datos existentes:
   - Crear un respaldo antes de migraciones de riesgo.
   - No ejecutar `docker compose down -v`, `prisma migrate reset` ni comandos destructivos sin autorización explícita.
   - No eliminar registros históricos para resolver un error de integridad; preferir archivo lógico, suspensión, migración de datos o rechazo explicado.
   - Si una eliminación es necesaria, revisar todas las relaciones Prisma y definir comportamiento `onDelete`, dependencias, auditoría y restauración.

4. Para portabilidad entre equipos:
   - Documentar variables de entorno requeridas sin incluir secretos reales.
   - Mantener migraciones y scripts en el repositorio.
   - Explicar si se requiere `seed` o restauración de un `.dump`.
   - Usar el volumen `postgres_data` para persistencia local, pero no tratarlo como respaldo portable.
   - Los archivos de respaldo son sensibles y deben permanecer fuera de Git.

5. Para el seed:
   - Mantenerlo idempotente: repetirlo no debe duplicar sedes, tarifas, usuarios ni configuración demo.
   - No sobrescribir datos reales de negocio accidentalmente.
   - No ejecutar el seed en producción salvo decisión operativa explícita.
   - No imprimir ni incrustar contraseñas reales; usar variables de entorno para credenciales demo.

6. Para configuración:
   - Guardar cambios mediante servicios y endpoints existentes, no solo en estado local del Frontend.
   - Verificar que eliminaciones de formularios se reflejen realmente en la base de datos.
   - Preservar configuraciones de pagos, tarifas, permisos, sedes y parámetros operativos al migrar.

7. Para permisos y seguridad:
   - Validar roles, permisos por pantalla y excepciones por usuario en Backend y Frontend.
   - Un arreglo vacío de permisos puede significar una denegación explícita; no reemplazarlo automáticamente por permisos heredados.
   - Registrar en auditoría los cambios sensibles de datos, permisos, configuración y eliminaciones.

## Validación mínima antes de finalizar

Ejecutar, según el alcance del cambio:

```powershell
cd Backend
npx prisma validate
npx prisma generate
npm run build
npm test -- --runInBand

cd ..\Frontend
npm run build

cd ..
git diff --check
```

También comprobar:

- Que una base nueva pueda crearse con migraciones.
- Que una base con datos existentes pueda migrarse sin pérdida.
- Que el respaldo pueda restaurarse en una instancia aislada.
- Que las pruebas de comportamiento y E2E relevantes sigan pasando.
- Que el README o `Documentador/manual técnico.md` describa cualquier procedimiento nuevo de persistencia.

## Archivos de referencia

- `Backend/prisma/schema.prisma`
- `Backend/prisma/migrations/`
- `Backend/prisma/seed.ts`
- `docker-compose.yml`
- `.env.example`
- `ops/database_backup.ps1`
- `ops/database_restore.ps1`
- `Documentador/manual técnico.md`
- `README.md`
