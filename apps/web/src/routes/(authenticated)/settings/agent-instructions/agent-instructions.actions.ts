import { parseHonoResponse } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import { instructionInputSchema, instructionRecordSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'

async function read() {
  const endpoint = rpc['cloudflare-os'].instructions.$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({}))
  return instructionRecordSchema.parse(result.data)
}

async function update(input: { text: string }) {
  const endpoint = rpc['cloudflare-os'].instructions.$put
  const request = instructionInputSchema.parse(input)
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ json: request }))
  return instructionRecordSchema.parse(result.data)
}

export const agentInstructionsActions = { read, update }
