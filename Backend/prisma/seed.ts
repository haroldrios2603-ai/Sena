import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Script de Semillas (Seed) para Base de Datos.
 * Crea usuarios iniciales (Super Admin y Operador) para pruebas.
 */
async function main() {
    console.log('🌱 Iniciando siembra de datos...');

    // Generar hash de contraseña predeterminada: '123456'
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash('123456', salt);

    // Crear Usuario Super Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@rmparking.com' },
        update: {},
        create: {
            email: 'admin@rmparking.com',
            fullName: 'Administrador Principal',
            passwordHash,
            role: Role.SUPER_ADMIN,
        },
    });
    console.log('✅ Usuario Admin creado: admin@rmparking.com / 123456');

    // Crear Usuario Operador
    const operator = await prisma.user.upsert({
        where: { email: 'operador@rmparking.com' },
        update: {},
        create: {
            email: 'operador@rmparking.com',
            fullName: 'Operador de Turno',
            passwordHash,
            role: Role.OPERATOR,
        },
    });
    console.log('✅ Usuario Operador creado: operador@rmparking.com / 123456');

    // Crear Parqueadero de Ejemplo
    await prisma.parking.create({
        data: {
            name: 'RM Parking Central',
            address: 'Calle 123 # 45-67',
            capacity: 50,
            baseRate: 5000,
            tariffs: {
                create: [
                    { vehicleType: 'CAR', baseRate: 5000, hourlyRate: 3000, dayRate: 25000 },
                    { vehicleType: 'MOTORCYCLE', baseRate: 2000, hourlyRate: 1000, dayRate: 10000 },
                ]
            }
        }
    });
    console.log('✅ Parqueadero de ejemplo creado: RM Parking Central');

    console.log('🌱 Siembra finalizada con éxito.');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
