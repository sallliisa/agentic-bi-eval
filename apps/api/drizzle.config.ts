import { defineConfig } from 'drizzle-kit'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for Drizzle commands.')
}

export default defineConfig({
  schema: ['./src/routes/**/*.table.ts', './src/routes/auth/auth.entity.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
