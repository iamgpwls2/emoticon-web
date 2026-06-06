import { env } from './config/env.js';
import app from './app.js';
import promptRoutes from './routes/prompt.routes.js';
import uploadRoutes from './routes/upload.routes.js';

app.use('/api/prompts', promptRoutes);
app.use('/api/uploads', uploadRoutes);

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
