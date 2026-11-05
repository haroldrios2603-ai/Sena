import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Script de Semillas (Seed) para Base de Datos.
 * Crea usuarios iniciales (Super Admin y Operador) para pruebas.
 */
async function main() {
    console.log('🌱 Iniciando siembra de datos...');

    // ES: La contraseña se puede inyectar desde el entorno para no depender de una clave fija.
    const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? '123456';
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(seedPassword, salt);

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
    console.log('✅ Usuario Admin disponible: admin@rmparking.com');

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
    console.log('✅ Usuario Operador disponible: operador@rmparking.com');

    // ES: Buscar por nombre evita crear otra sede cada vez que se restaura o inicializa el proyecto.
    const existingParking = await prisma.parking.findFirst({
        where: { name: 'RM Parking Central' },
        select: { id: true },
    });
    const parking = existingParking
        ? await prisma.parking.update({
            where: { id: existingParking.id },
            data: {
                address: 'Calle 123 # 45-67',
                capacity: 50,
                baseRate: 5000,
            },
        })
        : await prisma.parking.create({
            data: {
                name: 'RM Parking Central',
                address: 'Calle 123 # 45-67',
                capacity: 50,
                baseRate: 5000,
            },
        });

    await prisma.tariff.upsert({
        where: { parkingId_vehicleType: { parkingId: parking.id, vehicleType: 'CAR' } },
        update: { baseRate: 5000, hourlyRate: 3000, dayRate: 25000 },
        create: { parkingId: parking.id, vehicleType: 'CAR', baseRate: 5000, hourlyRate: 3000, dayRate: 25000 },
    });
    await prisma.tariff.upsert({
        where: { parkingId_vehicleType: { parkingId: parking.id, vehicleType: 'MOTORCYCLE' } },
        update: { baseRate: 2000, hourlyRate: 1000, dayRate: 10000 },
        create: { parkingId: parking.id, vehicleType: 'MOTORCYCLE', baseRate: 2000, hourlyRate: 1000, dayRate: 10000 },
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
