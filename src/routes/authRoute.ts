import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  updateProfileHandler,
  changePasswordHandler,
} from '../controllers/authController'

const router = Router()

router.post('/register', registerHandler)
router.post('/login', loginHandler)

router.get('/me', authMiddleware, meHandler)
router.post('/logout', authMiddleware, logoutHandler)
router.put('/profile', authMiddleware, updateProfileHandler)
router.put('/password', authMiddleware, changePasswordHandler)

export default router