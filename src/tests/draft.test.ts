import request from 'supertest'
import app from '../app'
import { registerAndLoginUser } from './helpers'

describe('drafts', () => {
  it('creates, fetches, updates, and deletes a draft', async () => {
    const { token } = await registerAndLoginUser()

    const createRes = await request(app)
      .post('/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'My Draft',
        contentHtml: '<article><p>Hello</p></article>',
      })

    expect(createRes.status).toBe(201)

    const draftId = createRes.body.data.id

    const getRes = await request(app)
      .get(`/drafts/${draftId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.data.title).toBe('My Draft')

    const updateRes = await request(app)
      .put(`/drafts/${draftId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Draft',
      })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.title).toBe('Updated Draft')

    const deleteRes = await request(app)
      .delete(`/drafts/${draftId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)
  })

  it('lists drafts and validates ids', async () => {
    const { token } = await registerAndLoginUser()

    const listRes = await request(app)
      .get('/drafts')
      .set('Authorization', `Bearer ${token}`)

    expect(listRes.status).toBe(200)
    expect(Array.isArray(listRes.body.data)).toBe(true)

    const invalidIdRes = await request(app)
      .get('/drafts/abc')
      .set('Authorization', `Bearer ${token}`)

    expect(invalidIdRes.status).toBe(400)

    const notFoundRes = await request(app)
      .get('/drafts/99999')
      .set('Authorization', `Bearer ${token}`)

    expect(notFoundRes.status).toBe(404)
  })
})
