import request from 'supertest'
import app from '../app'
import { registerAndLoginAdmin } from './helpers'

describe('admin users', () => {
  it('lists, creates, updates, and resets user password', async () => {
    const { token } = await registerAndLoginAdmin()

    const listRes = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`)

    expect(listRes.status).toBe(200)
    expect(Array.isArray(listRes.body.data)).toBe(true)

    const createRes = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Editor User',
        email: 'editor@example.com',
        password: 'Password123!',
        roleName: 'editor',
        status: 'ACTIVE',
      })

    if (createRes.status !== 201) {
      // eslint-disable-next-line no-console
      console.log('admin create user error:', createRes.status, createRes.body)
    }

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.email).toBe('editor@example.com')

    const userId = createRes.body.data.id

    const updateRes = await request(app)
      .put(`/admin/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Editor Updated',
      })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.name).toBe('Editor Updated')

    const statusRes = await request(app)
      .patch(`/admin/users/${userId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SUSPENDED' })

    expect(statusRes.status).toBe(200)
    expect(statusRes.body.data.status).toBe('SUSPENDED')

    const resetRes = await request(app)
      .put(`/admin/users/${userId}/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'NewPassword123!' })

    if (resetRes.status !== 200) {
      // eslint-disable-next-line no-console
      console.log('admin reset password error:', resetRes.status, resetRes.body)
    }

    expect(resetRes.status).toBe(200)

    const reactivateRes = await request(app)
      .patch(`/admin/users/${userId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ACTIVE' })

    expect(reactivateRes.status).toBe(200)

    const loginRes = await request(app).post('/auth/login').send({
      email: 'editor@example.com',
      password: 'NewPassword123!',
    })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.success).toBe(true)
  })
})
