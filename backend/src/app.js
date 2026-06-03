import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';

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

export default app;
