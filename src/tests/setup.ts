import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { beforeAll, beforeEach, afterAll } from 'vitest'
import { ensureStorageDirectories } from '../config/storage'
import type { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.test' })

let prisma: PrismaClient

async function getPrisma() {
  if (!prisma) {
    prisma = (await import('../lib/prisma.js')).prisma
  }
  return prisma
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  ensureStorageDirectories()
})

beforeEach(async () => {
  const prismaClient = await getPrisma()

  await prismaClient.userSession.deleteMany()
  await prismaClient.userCredential.deleteMany()
  await prismaClient.aiProviderConfig.deleteMany()
  await prismaClient.draftImage.deleteMany()
  await prismaClient.draftSeoMeta.deleteMany()
  await prismaClient.wpPostSync.deleteMany()
  await prismaClient.draft.deleteMany()
  await prismaClient.wpSite.deleteMany()
  await prismaClient.usageLog.deleteMany()
  await prismaClient.user.deleteMany()
  await prismaClient.role.deleteMany()

  await prismaClient.role.createMany({
    data: [
      { name: 'admin', description: 'Administrator' },
      { name: 'editor', description: 'Editor' },
    ],
    skipDuplicates: true,
  })

  const uploadsRoot = path.resolve(process.cwd(), 'uploads')
  if (fs.existsSync(uploadsRoot)) {
    try {
      fs.rmSync(uploadsRoot, { recursive: true, force: true })
    } catch (error) {
      // Ignore occasional Windows file lock errors during tests
    }
  }
  ensureStorageDirectories()
})

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
})
