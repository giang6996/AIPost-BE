import request from 'supertest'
import app from '../app'
import { registerAndLoginUser } from './helpers'

describe('ai config', () => {
  it('saves, gets, and deletes openai config', async () => {
    const { token } = await registerAndLoginUser()

    const saveRes = await request(app)
      .post('/ai/config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        apiKey: 'sk-test-key',
        defaultTextModel: 'gpt-5.4',
        defaultImageModel: 'gpt-image-1.5',
      })

    expect(saveRes.status).toBe(200)
    expect(saveRes.body.success).toBe(true)

    const getRes = await request(app)
      .get('/ai/config')
      .set('Authorization', `Bearer ${token}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.data.hasApiKey).toBe(true)

    const deleteRes = await request(app)
      .delete('/ai/config')
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)

    const getAfterDeleteRes = await request(app)
      .get('/ai/config')
      .set('Authorization', `Bearer ${token}`)

    expect(getAfterDeleteRes.status).toBe(200)
  })
})