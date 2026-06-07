import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import generationRoutes from './routes/generation.routes.js';
import promptRoutes from './routes/prompt.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import {
  errorHandler,
  notFoundHandler,
} from './middlewares/error.middleware.js';

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Emoticon Web API Server');
});

const healthHandler = (_req, res) => {
  res.json({
    ok: true,
    message: 'Server is running',
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/generations', generationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
