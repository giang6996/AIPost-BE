import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import {
  getOpenAiConfigHandler,
  saveOpenAiConfigHandler,
  deleteOpenAiConfigHandler,
  generateImageHandler,
  generatePostHandler,
  generateTitleHandler, 
  generateSeoHandler,
  rewriteSectionHandler
} from '../controllers/aiController'

const router = Router()

router.use(authMiddleware)

router.get('/config', getOpenAiConfigHandler)
router.post('/config', saveOpenAiConfigHandler)
router.put('/config', saveOpenAiConfigHandler)
router.delete('/config', deleteOpenAiConfigHandler)

router.post('/generate-image', generateImageHandler)
router.post('/generate-post', generatePostHandler)
router.post('/generate-title', generateTitleHandler)
router.post('/generate-seo', generateSeoHandler)
router.post('/rewrite-section', rewriteSectionHandler)

export default router