import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import StudySession from '../models/StudySession.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { addDays } from '../utils/scheduler.js';

const r = Router();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const seconds = z.number().int().min(60).max(43200);
const own = req => ({ _id: req.params.id, user: req.userId });

r.get('/', asyncHandler(async (req, res) => {
  const { date: d } = z.object({ date }).parse(req.query);
  res.json(await StudySession.find({ user: req.userId, date: d }).sort('startedAt').lean());
}));

r.get('/summary', asyncHandler(async (req, res) => {
  const { today } = z.object({ today: date }).parse(req.query);
  const rows = await StudySession.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
    { $group: { _id: '$date', seconds: { $sum: '$seconds' } } }
  ]);
  const by = Object.fromEntries(rows.map(x => [x._id, x.seconds]));
  const days = Array.from({ length: 14 }, (_, i) => { const d = addDays(today, i - 13); return { date: d, seconds: by[d] || 0 }; });
  res.json({
    today: by[today] || 0,
    week: days.slice(-7).reduce((n, d) => n + d.seconds, 0),
    total: rows.reduce((n, x) => n + x.seconds, 0),
    days
  });
}));

r.post('/', asyncHandler(async (req, res) => {
  const data = z.object({ date, seconds, source: z.enum(['pomodoro', 'manual']).default('manual'), startedAt: z.string().datetime().optional() }).parse(req.body);
  res.status(201).json(await StudySession.create({ ...data, user: req.userId }));
}));

r.put('/:id', asyncHandler(async (req, res) => {
  const body = z.object({ seconds }).parse(req.body);
  const s = await StudySession.findOneAndUpdate(own(req), body, { new: true });
  if (!s) throw httpError(404, 'Session not found');
  res.json(s);
}));

r.delete('/:id', asyncHandler(async (req, res) => {
  if (!(await StudySession.findOneAndDelete(own(req)))) throw httpError(404, 'Session not found');
  res.json({ ok: true });
}));

export default r;
