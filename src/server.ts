import app from './app'
import { env } from './config/env'
import { ensureStorageDirectories } from './config/storage'

ensureStorageDirectories()

app.listen(env.port, () => {
  console.log(`Server running at http://localhost:${env.port}`)
})