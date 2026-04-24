import request from 'supertest'
import app from '../app'

export async function registerAndLoginUser(input?: {
  name?: string
  email?: string
  password?: string
}) {
  const name = input?.name ?? 'admin'
  const email = input?.email ?? 'test@gmail.com'
  const password = input?.password ?? 'test123@abc'

  await request(app).post('/auth/register').send({
    name,
    email,
    password,
  })

  const loginRes = await request(app).post('/auth/login').send({
    email,
    password,
  })

  const token = loginRes.body?.data?.token as string

  return {
    token,
    email,
    password,
  }
}

export async function registerAndLoginAdmin() {
  const adminRole = await (await import('../lib/prisma.js')).prisma.role.findUnique({
    where: { name: 'admin' },
  })

  const prisma = (await import('../lib/prisma.js')).prisma

  const user = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      roleId: adminRole!.id,
      status: 'ACTIVE',
      credential: {
        create: {
          passwordHash: await (await import('../utils/password.js')).hashPassword('Password123!'),
        },
      },
    },
  })

  const loginRes = await request(app).post('/auth/login').send({
    email: 'admin@example.com',
    password: 'Password123!',
  })

  return {
    token: loginRes.body?.data?.token as string,
    userId: user.id,
  }
}