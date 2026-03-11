/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import peopleRoutes from './routes/people.js'
import eventsRoutes from './routes/events.js'
import tagsRoutes from './routes/tags.js'
import personTagsRoutes from './routes/person_tags.js'
import eventParticipantsRoutes from './routes/event_participants.js'
import relationshipsRoutes from './routes/relationships.js'
import dataRoutes from './routes/data.js'
import imagesRoutes from './routes/images.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/people', peopleRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/tags', tagsRoutes)
app.use('/api/person_tags', personTagsRoutes)
app.use('/api/event_participants', eventParticipantsRoutes)
app.use('/api/relationships', relationshipsRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/images', imagesRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(error);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    message: error.message
  })
})

/**
 * Serve static files in production
 */
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../web/dist')
  
  app.use(express.static(distPath))
  
  // Explicitly return 404 for API requests not handled
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API not found',
    })
  })

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
