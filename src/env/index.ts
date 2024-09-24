import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number(),
  NODE_ENV: z
    .enum(['production', 'development', 'test'])
    .default('development'),
  DATABASE_URL: z.string(),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.log('⚠️⚠️ Invalid enviroment variables!', _env.error.format())

  throw new Error('Invalid enviroment variables!')
}

export const env = _env.data
