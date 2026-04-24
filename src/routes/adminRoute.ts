import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/requiredRole'
import {
  adminCreateUserHandler,
  adminDeleteDraftHandler,
  adminDeleteSiteHandler,
  adminGetDraftHandler,
  adminGetSiteHandler,
  adminListDraftsHandler,
  adminListSitesHandler,
  adminListUsersHandler,
  adminResetUserPasswordHandler,
  adminUpdateUserHandler,
  adminUpdateUserStatusHandler,
} from '../controllers/adminController'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('admin'))

router.get('/users', adminListUsersHandler)
router.post('/users', adminCreateUserHandler)
router.put('/users/:id', adminUpdateUserHandler)
router.patch('/users/:id/status', adminUpdateUserStatusHandler)
router.put('/users/:id/password', adminResetUserPasswordHandler)

router.get('/drafts', adminListDraftsHandler)
router.get('/drafts/:id', adminGetDraftHandler)
router.delete('/drafts/:id', adminDeleteDraftHandler)

router.get('/sites', adminListSitesHandler)
router.get('/sites/:id', adminGetSiteHandler)
router.delete('/sites/:id', adminDeleteSiteHandler)

export default router