import { Schema, model } from 'mongoose';

const topic = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  subject: { type: String, default: 'General', trim: true },
  tags: [String],
  notes: { type: String, default: '' },
  link: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  firstStudied: String,
  code: [{ title: String, lang: String, body: String }],
  cards: [{ q: String, a: String }],
  // SM-2 scheduling state
  ease: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  nextReview: { type: String, required: true }, // YYYY-MM-DD
  history: [new Schema({ date: String, rating: String }, { _id: false })]
}, { timestamps: true });

topic.index({ user: 1, nextReview: 1 });
export default model('Topic', topic);
