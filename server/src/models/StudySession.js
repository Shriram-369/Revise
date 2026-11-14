import { Schema, model } from 'mongoose';

const session = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD, the day the session started (client's local date)
  startedAt: { type: Date, default: Date.now },
  seconds: { type: Number, required: true, min: 60, max: 43200 }, // 1 minute to 12 hours
  source: { type: String, enum: ['pomodoro', 'manual'], default: 'manual' }
}, { timestamps: true });

session.index({ user: 1, date: 1 });
export default model('StudySession', session);
