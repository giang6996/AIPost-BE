import express from 'express';
import path from 'path'
import siteRoutes from './routes/siteRoute'
import draftRoutes from './routes/draftRoute'
import mediaRoutes from './routes/mediaRoutes'
import aiRoutes from './routes/aiRoute'
import authRoutes from './routes/authRoute'
import adminRoutes from './routes/adminRoute'
import { env } from './config/env.js'

const app = express()
const cors = require('cors')

app.use(cors({
  // CORS must stay strict because API uses credentialed browser requests.
  // Only explicitly allowed frontend origins should be able to call it from the browser.
  origin: env.corsOrigins,
  credentials: true,
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads'))
)

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
  })
})

app.use('/admin', adminRoutes)
app.use('/auth', authRoutes)
app.use('/ai', aiRoutes)
app.use('/sites', siteRoutes)
app.use('/drafts', draftRoutes)
app.use('/', mediaRoutes)

export default app
