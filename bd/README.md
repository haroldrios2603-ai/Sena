# Gestión de Base de Datos - RM Parking

Este directorio contiene la verdad absoluta sobre la estructura de la base de datos PostgreSQL para RM Parking.

## Estructura

- `/migraciones`: Scripts SQL versionados para control de esquema.
- `/docs`: Documentación de diccionario de datos, modelos E-R y procedimientos almacenados.

## Normas de Versionamiento

Los scripts de migración deben seguir el formato:
`V{Numero}_{Descripcion}.sql`

Ejemplo:
- `V001_Inicializacion_Esquema.sql`
- `V002_Tabla_Usuarios.sql`

## Ejecución

Según el PROJECT_BRIEF y las reglas el rol:
- Los scripts son la fuente de verdad.
- Pueden ser ejecutados manualmente o mediante herramientas de CI/CD.
- Si el backend utiliza Prisma, se recomienda introspección (`prisma db pull`) o sincronización cuidadosa.
