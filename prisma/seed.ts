import { PrismaClient, Role, MineralType, MineralTarget, SampleStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(data: {
  nombre: string;
  email: string;
  telefono: string;
  documento: string;
  password: string;
  role: Role;
}) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      documento: data.documento,
      passwordHash,
      role: data.role,
    },
  });
}

async function main() {
  console.log('🌱 Sembrando datos demo de LabTech Minero...');

  const admin = await upsertUser({
    nombre: 'Administrador LabTech',
    email: 'admin@labtechminero.pe',
    telefono: '987000001',
    documento: '20601234567',
    password: 'admin1234',
    role: Role.ADMIN,
  });

  await upsertUser({
    nombre: 'Recepción LabTech',
    email: 'operador@labtechminero.pe',
    telefono: '987000002',
    documento: '40000001',
    password: 'operador1234',
    role: Role.OPERADOR,
  });

  await upsertUser({
    nombre: 'Laboratorista LabTech',
    email: 'laboratorista@labtechminero.pe',
    telefono: '987000003',
    documento: '40000002',
    password: 'laboratorista1234',
    role: Role.LABORATORISTA,
  });

  const cliente = await upsertUser({
    nombre: 'Cliente Demo',
    email: 'demo@labtech.pe',
    telefono: '987654321',
    documento: '20601111111',
    password: 'demo1234',
    role: Role.CLIENTE,
  });

  const existingSample = await prisma.sample.findFirst({ where: { clienteId: cliente.id } });
  if (!existingSample) {
    await prisma.sample.create({
      data: {
        codigo: `LTM-${new Date().getFullYear()}-000001`,
        clienteId: cliente.id,
        tipoMineral: MineralType.OXIDO,
        mineral: MineralTarget.ORO,
        descripcion: 'Veta San José - Lote 14 (muestra demo)',
        precio: 60,
        estado: SampleStatus.PENDIENTE_PAGO,
        statusHistory: {
          create: { estadoNuevo: SampleStatus.PENDIENTE_PAGO, nota: 'Muestra semilla de demostración' },
        },
      },
    });
  }

  console.log('✅ Seed completado.');
  console.log('   admin@labtechminero.pe / admin1234');
  console.log('   operador@labtechminero.pe / operador1234');
  console.log('   laboratorista@labtechminero.pe / laboratorista1234');
  console.log('   demo@labtech.pe / demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
