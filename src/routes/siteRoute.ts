import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import {
  createSiteHandler,
  createSiteCategoryHandler,
  createSiteTagHandler,
  listSites,
  testConnectionHandler,
  listSiteCategoriesHandler,
  listSiteTagsHandler,
  updateSiteHandler,
  updateSiteCategoryHandler,
  updateSiteTagHandler,
  deleteSiteHandler
} from '../controllers/siteController'

const router = Router()

router.use(authMiddleware)

router.get('/', listSites)
router.post('/', createSiteHandler)
router.put('/:id', updateSiteHandler)
router.get('/:id/categories', listSiteCategoriesHandler)
router.post('/:id/categories', createSiteCategoryHandler)
router.put('/:id/categories/:categoryId', updateSiteCategoryHandler)
router.get('/:id/tags', listSiteTagsHandler)
router.post('/:id/tags', createSiteTagHandler)
router.put('/:id/tags/:tagId', updateSiteTagHandler)
router.post('/test-connection', testConnectionHandler)
router.delete('/:id', deleteSiteHandler)

export default router