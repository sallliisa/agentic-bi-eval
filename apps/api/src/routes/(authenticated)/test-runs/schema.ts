import { z } from 'zod/v4'

export const testRunUpdateSchema = z.object({ name: z.string().trim().min(1) }).strict()
