import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import {
  createDraftHandler,
  getDraftHandler,
  listDrafts,
  getDraftCategoriesHandler,
  getDraftTagsHandler,
  updateDraftCategoriesHandler,
  updateDraftTagsHandler,
  updateDraftHandler,
  updateDraftSeoHandler,
  getDraftSeoHandler,
  deleteDraftHandler
} from '../controllers/draftController'
import { publishDraftHandler, deleteDraftSyncHandler } from '../controllers/syncController'

const router = Router()

router.use(authMiddleware)

router.get('/', listDrafts)
router.get('/:id', getDraftHandler)
router.post('/', createDraftHandler)
router.put('/:id', updateDraftHandler)
router.post('/:id/publish', publishDraftHandler)
router.put('/:id/seo', updateDraftSeoHandler)
router.get('/:id/seo', getDraftSeoHandler)
router.get('/:id/categories', getDraftCategoriesHandler)
router.put('/:id/categories', updateDraftCategoriesHandler)
router.get('/:id/tags', getDraftTagsHandler)
router.put('/:id/tags', updateDraftTagsHandler)
router.delete('/:id/sites/:siteId', deleteDraftSyncHandler)
router.delete('/:id', deleteDraftHandler)

export default router