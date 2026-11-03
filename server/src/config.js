import 'dotenv/config';
import { z } from 'zod';

const parsed = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters')
}).safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.issues.map(i => `${i.path}: ${i.message}`).join('; '));
  process.exit(1);
}
export default parsed.data;
