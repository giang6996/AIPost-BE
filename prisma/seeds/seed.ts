import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = bcrypt.hashSync('test123@2abc', 12)

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'System administrator',
    },
  })

  await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      description: 'Content editor',
    },
  })

  await prisma.user.upsert({
    where: { id: 1 },
    update: {
      name: 'admin',
      email: 'test@gmail.com',
      roleId: adminRole.id,
    },
    create: {
      id: 1,
      name: 'admin',
      email: 'test@gmail.com',
      roleId: adminRole.id,
    },
  })

  await prisma.userCredential.upsert({
    where: { userId: 1 },
    update: {
      passwordHash,
    },
    create: {
      userId: 1,
      passwordHash,
    },
  })

  console.log('Roles and admin user seeded successfully')


}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
