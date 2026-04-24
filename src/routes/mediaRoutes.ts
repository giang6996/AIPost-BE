import { Router } from 'express'
import {
  listDraftImagesHandler,
  uploadDraftImageHandler,
  uploadDraftImageToWpHandler,
  setDraftFeaturedImageHandler,
  insertDraftImageHandler,
  saveGeneratedDraftImageHandler,
  updateDraftImageHandler,
  deleteDraftImageHandler,
} from '../controllers/mediaController'
import { upload } from '../middleware/upload'

const router = Router()

router.get('/drafts/:id/images', listDraftImagesHandler)
router.post('/drafts/:id/images/upload', upload.single('image'), uploadDraftImageHandler)
router.post('/drafts/:id/images/:imageId/upload-to-wp', uploadDraftImageToWpHandler)
router.post('/drafts/:id/images/:imageId/set-featured', setDraftFeaturedImageHandler)
router.post('/drafts/:id/images/:imageId/insert', insertDraftImageHandler)
router.post('/drafts/:id/images/save-generated', saveGeneratedDraftImageHandler)
router.put('/drafts/:id/images/:imageId', updateDraftImageHandler)
router.delete('/drafts/:id/images/:imageId', deleteDraftImageHandler)

export default router