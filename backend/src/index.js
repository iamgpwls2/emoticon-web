import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  process.env.CLIENT_URL ||
  'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});