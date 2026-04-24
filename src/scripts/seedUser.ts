import { prisma } from '../lib/prisma'

async function main() {
  const existing = await prisma.user.findFirst({
    where: { email: 'test@example.com' },
  })

  if (existing) {
    console.log('Test user already exists:', existing)
    return
  }

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: 'testhash',
      displayName: 'Test User',
      status: 'ACTIVE',
    },
  })

  console.log('Created test user:', user)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })