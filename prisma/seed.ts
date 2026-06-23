import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const clinic = await prisma.clinic.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: { name: 'Demo Clinic', code: 'DEMO' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Full access' },
  });
  await prisma.role.upsert({
    where: { name: 'NURSE' },
    update: {},
    create: { name: 'NURSE', description: 'Clinical staff' },
  });

  const email = 'admin@demo.clinic';
  const existing = await prisma.user.findUnique({
    where: { clinicId_email: { clinicId: clinic.id, email } },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        clinicId: clinic.id,
        email,
        fullName: 'Demo Admin',
        passwordHash: await bcrypt.hash('password123', 10),
        roleId: adminRole.id,
      },
    });
  }

  console.log('Seed complete.');
  console.log(`  clinicId: ${clinic.id}`);
  console.log(`  login:    ${email} / password123`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
