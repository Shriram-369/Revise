import { Schema, model } from 'mongoose';

export default model('User', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  dailyGoal: { type: Number, default: 5, min: 1, max: 100 }
}, { timestamps: true }));
