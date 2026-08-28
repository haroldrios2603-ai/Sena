"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando siembra de datos...');
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash('123456', salt);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@rmparking.com' },
        update: {},
        create: {
            email: 'admin@rmparking.com',
            fullName: 'Administrador Principal',
            passwordHash,
            role: client_1.Role.SUPER_ADMIN,
        },
    });
    console.log('✅ Usuario Admin creado: admin@rmparking.com / 123456');
    const operator = await prisma.user.upsert({
        where: { email: 'operador@rmparking.com' },
        update: {},
        create: {
            email: 'operador@rmparking.com',
            fullName: 'Operador de Turno',
            passwordHash,
            role: client_1.Role.OPERATOR,
        },
    });
    console.log('✅ Usuario Operador creado: operador@rmparking.com / 123456');
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
//# sourceMappingURL=seed.js.map