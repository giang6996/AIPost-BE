import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const initialAdminEmail =
    process.env.INITIAL_ADMIN_EMAIL ?? 'test@gmail.com' // Set env variable

  const initialAdminPassword =
    process.env.INITIAL_ADMIN_PASSWORD ?? 'test123@abc' // Set env variable

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

  const adminUser = await prisma.user.upsert({
    where: {
      email: initialAdminEmail,
    },
    update: {},
    create: {
      name: 'admin',
      email: initialAdminEmail,
      roleId: adminRole.id,
    },
  })

  const passwordHash = bcrypt.hashSync(initialAdminPassword, 12)

  await prisma.userCredential.upsert({
    where: {
      userId: adminUser.id,
    },
    update: {},
    create: {
      userId: adminUser.id,
      passwordHash,
    },
  })

  console.log('Required roles and initial admin account are present')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })