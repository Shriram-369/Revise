import { Router } from 'express';
import { z } from 'zod';
import Topic from '../models/Topic.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { RATINGS, addDays, schedule } from '../utils/scheduler.js';

const r = Router();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const body = z.object({
  title: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(60).default('General'),
  tags: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
  notes: z.string().max(20000).default(''),
  link: z.string().max(500).refine(v => !v || /^https?:\/\//i.test(v), 'Link must start with http:// or https://').default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  firstStudied: date,
  code: z.array(z.object({ title: z.string().max(120).default(''), lang: z.string().max(30).default('plaintext'), body: z.string().min(1).max(20000) })).max(20).default([]),
  cards: z.array(z.object({ q: z.string().min(1).max(1000), a: z.string().max(4000).default('') })).max(50).default([])
});
const own = req => ({ _id: req.params.id, user: req.userId });

r.get('/', asyncHandler(async (req, res) => {
  const { q, subject, conf, due, page, limit } = z.object({
    q: z.string().max(100).optional(), subject: z.string().max(60).optional(),
    conf: z.enum(['weak', 'medium', 'strong']).optional(), due: date.optional(),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20)
  }).parse(req.query);
  const f = { user: req.userId };
  if (subject) f.subject = subject;
  if (conf) f.interval = { weak: { $lt: 3 }, medium: { $gte: 3, $lt: 21 }, strong: { $gte: 21 } }[conf];
  if (due) f.nextReview = { $lte: due };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = ['title', 'subject', 'notes', 'tags', 'code.body', 'cards.q'].map(k => ({ [k]: rx }));
  }
  const [items, total] = await Promise.all([
    Topic.find(f).sort('nextReview title').skip((page - 1) * limit).limit(limit).lean(),
    Topic.countDocuments(f)
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

r.get('/stats', asyncHandler(async (req, res) => {
  const { today } = z.object({ today: date }).parse(req.query);
  const ts = await Topic.find({ user: req.userId }).select('subject interval nextReview history').lean();
  const activity = {}, bySubject = {};
  let weak = 0, dueNow = 0;
  for (const t of ts) {
    for (const h of t.history) activity[h.date] = (activity[h.date] || 0) + 1;
    const s = (bySubject[t.subject] ??= { total: 0, weak: 0 });
    s.total++;
    if (t.interval < 3) { weak++; s.weak++; }
    if (t.nextReview <= today) dueNow++;
  }
  let streak = 0, d = activity[today] ? today : addDays(today, -1);
  while (activity[d]) { streak++; d = addDays(d, -1); }
  const heat = Array.from({ length: 84 }, (_, i) => { const x = addDays(today, i - 83); return { date: x, count: activity[x] || 0 }; });
  const upcoming = Array.from({ length: 7 }, (_, i) => { const x = addDays(today, i + 1); return { date: x, count: ts.filter(t => t.nextReview === x).length }; });
  res.json({ total: ts.length, weak, dueNow, streak, doneToday: activity[today] || 0, week: heat.slice(-7).reduce((n, h) => n + h.count, 0), heat, upcoming, bySubject });
}));

r.get('/export', asyncHandler(async (req, res) => res.json(await Topic.find({ user: req.userId }).select('-user -__v -createdAt -updatedAt').lean())));

const importItem = body.extend({
  ease: z.number().min(1.3).max(5).optional(), interval: z.number().int().min(0).max(3650).optional(),
  reps: z.number().int().min(0).optional(), nextReview: date.optional(),
  history: z.array(z.object({ date, rating: z.enum(RATINGS) })).max(1000).optional()
});
r.post('/import', asyncHandler(async (req, res) => {
  const rows = z.array(importItem).max(500).parse(req.body.topics);
  const docs = await Topic.insertMany(rows.map(t => ({ ...t, user: req.userId, nextReview: t.nextReview ?? addDays(t.firstStudied, 1) })));
  res.status(201).json({ added: docs.length });
}));

r.post('/', asyncHandler(async (req, res) => {
  const { today, ...data } = body.extend({ today: date }).parse(req.body);
  const next = addDays(data.firstStudied, 1);
  res.status(201).json(await Topic.create({ ...data, user: req.userId, nextReview: next > today ? next : today }));
}));

r.put('/:id', asyncHandler(async (req, res) => {
  const t = await Topic.findOneAndUpdate(own(req), body.partial().parse(req.body), { new: true });
  if (!t) throw httpError(404, 'Topic not found');
  res.json(t);
}));

r.post('/:id/revise', asyncHandler(async (req, res) => {
  const { rating, today } = z.object({ rating: z.enum(RATINGS), today: date }).parse(req.body);
  const t = await Topic.findOne(own(req));
  if (!t) throw httpError(404, 'Topic not found');
  Object.assign(t, schedule(t, rating, today));
  t.history.push({ date: today, rating });
  res.json(await t.save());
}));

r.delete('/:id', asyncHandler(async (req, res) => {
  if (!(await Topic.findOneAndDelete(own(req)))) throw httpError(404, 'Topic not found');
  res.json({ ok: true });
}));

export default r;
