# Arquitectura Técnica - RM Parking

## 1. Visión General
RM Parking es un sistema de gestión de estacionamientos basado en una arquitectura cliente-servidor, utilizando contenedores Docker para asegurar la portabilidad y consistencia entre entornos.

## 2. Tecnologías
- **Backend:** Node.js con el framework NestJS.
- **Frontend:** React + Vite, con estilos aplicados mediante Tailwind CSS.
- **Base de Datos:** PostgreSQL.
- **ORM:** Prisma para el mapeo de objetos y gestión de la base de datos.
- **QA:** Playwright para pruebas de integración y cordura.

## 3. Modelo de Datos (Prisma)
### Entidades Principales:
- **User:** Gestiona los usuarios y roles (Super Admin, Operador, etc.).
- **Parking:** Define las sedes y su capacidad.
- **Vehicle:** Registro de vehículos por placa.
- **Ticket:** Control de entradas activas.
- **Exit:** Registro de salidas y cálculos financieros.
- **Tariff:** Configuración de precios por tipo de vehículo.

## 4. Seguridad
- Autenticación basada en **JWT (JSON Web Tokens)**.
- Contraseñas protegidas mediante el algoritmo de hash **bcrypt**.
- Control de acceso basado en roles (RBAC).

## 5. Despliegue
El proyecto utiliza `docker-compose.yml` para levantar los servicios de base de datos, backend, frontend y herramientas de administración (Adminer).
