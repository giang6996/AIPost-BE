import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from '../app'
import { prisma } from '../lib/prisma'

describe('health checks', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports the process as alive', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toBe('Server is running')
  })

  it('reports readiness when PostgreSQL is reachable', async () => {
    const res = await request(app).get('/health/ready')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.ready).toBe(true)
    expect(res.body.checks.database).toBe('ok')
  })

  it('reports not ready when the database check fails', async () => {
    // Simulate a database outage without changing the test database itself.
    // This verifies the readiness endpoint behavior that Kubernetes or an ALB would see.
    vi.spyOn(prisma as unknown as { $queryRaw: () => Promise<unknown> }, '$queryRaw')
      .mockRejectedValueOnce(new Error('PostgreSQL unreachable'))

    const res = await request(app).get('/health/ready')

    expect(res.status).toBe(503)
    expect(res.body.success).toBe(false)
    expect(res.body.ready).toBe(false)
    expect(res.body.checks.database).toBe('down')
  })
})
