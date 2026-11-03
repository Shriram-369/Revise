import jwt from 'jsonwebtoken';
import env from '../config.js';
import { httpError } from './error.js';

export const COOKIE = 'token';

export const signIn = (res, userId) =>
  res.cookie(COOKIE, jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' }), {
    httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000
  });

export function requireAuth(req, _res, next) {
  try {
    req.userId = jwt.verify(req.cookies[COOKIE], env.JWT_SECRET).sub;
    next();
  } catch {
    next(httpError(401, 'Please sign in'));
  }
}
