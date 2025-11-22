import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authMiddleware.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';

const app = express()

app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())

// Ensure API responses are not cached by edge/browser to avoid serving stale data (304)
app.use('/api', (req, res, next) => {
	res.setHeader('Cache-Control', 'no-store')
	res.setHeader('Pragma', 'no-cache')
	res.setHeader('Surrogate-Control', 'no-store')
	// lightweight request log for debugging
	console.log(`[api-middleware] ${req.method} ${req.originalUrl}`)
	next()
})


app.get("/", (req, res) => res.send('Server is live!'))

app.use("/api/inngest", serve({client: inngest, functions}))

// Routes
app.use("/api/workspaces", protect, workspaceRouter)
app.use("/api/projects", protect, projectRouter)
app.use("/api/tasks", protect, taskRouter)
app.use("/api/comments", protect, commentRouter)

const PORT = process.env.PORT || 5000

app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`))
