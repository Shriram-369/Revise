import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { COOKIE, requireAuth, signIn } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';

const r = Router();
const creds = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(8).max(128) });
const pub = u => ({ id: u.id, email: u.email, dailyGoal: u.dailyGoal });

r.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = creds.parse(req.body);
  const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12) });
  signIn(res, user.id);
  res.status(201).json(pub(user));
}));

r.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = creds.parse(req.body);
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw httpError(401, 'Wrong email or password');
  signIn(res, user.id);
  res.json(pub(user));
}));

r.post('/logout', (_req, res) => res.clearCookie(COOKIE).json({ ok: true }));

r.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw httpError(401, 'Please sign in');
  res.json(pub(user));
}));

r.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const { dailyGoal } = z.object({ dailyGoal: z.number().int().min(1).max(100) }).parse(req.body);
  res.json(pub(await User.findByIdAndUpdate(req.userId, { dailyGoal }, { new: true })));
}));

export default r;
