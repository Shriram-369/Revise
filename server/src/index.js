import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import env from './config.js';
import authRoutes from './routes/auth.js';
import topicRoutes from './routes/topics.js';
import { requireAuth } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet(), compression(), express.json({ limit: '2mb' }), cookieParser());
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/healthz', (_req, res) => res.json({ ok: mongoose.connection.readyState === 1 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api/topics', requireAuth, topicRoutes);
app.use('/api', notFound);

if (env.NODE_ENV === 'production') {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(errorHandler);

await mongoose.connect(env.MONGODB_URI);
const server = app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
const stop = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
