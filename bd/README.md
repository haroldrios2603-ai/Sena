# Gestión de Base de Datos - RM Parking

Este directorio documenta lineamientos de base de datos para RM Parking.

## Estructura

- `Backend/prisma/schema.prisma`: modelo fuente del esquema relacional.
- `Backend/prisma/migrations/`: migraciones versionadas generadas con Prisma.
- `Backend/prisma/seed.ts`: datos semilla para usuarios y base funcional inicial.

## Normas de Versionamiento

Las migraciones son gestionadas por Prisma con carpeta timestamp por cambio de esquema.

Formato habitual:

`YYYYMMDDHHMMSS_descripcion_cambio/` + `migration.sql`

Ejemplo:
- `20260312134026_init/migration.sql`
- `20260313143000_reports_indexes/migration.sql`

## Ejecución

Comandos recomendados desde `Backend/`:

```bash
# aplicar migraciones en entorno objetivo
npx prisma migrate deploy

# regenerar cliente ORM
npx prisma generate

# poblar datos semilla
npx prisma db seed
```

## Recomendaciones

- Evitar cambios manuales directos a la base en ambientes compartidos.
- Versionar toda alteracion de esquema mediante migraciones Prisma.
- Validar migraciones en entorno local antes de desplegar.
