import request from 'supertest'
import app from '../app'

describe('auth', () => {
  it('registers, logs in, gets current user, and logs out', async () => {
    const registerRes = await request(app).post('/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    })

    expect(registerRes.status).toBe(201)
    expect(registerRes.body.success).toBe(true)

    const loginRes = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'Password123!',
    })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.success).toBe(true)

    const token = loginRes.body.data.token
    expect(token).toBeTruthy()

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(meRes.status).toBe(200)
    expect(meRes.body.data.email).toBe('test@example.com')

    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    expect(logoutRes.status).toBe(200)

    const meAfterLogoutRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(meAfterLogoutRes.status).toBe(401)
  })
})