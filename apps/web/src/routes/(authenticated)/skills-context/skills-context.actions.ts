import { parseHonoResponse } from '@/framework/hono'
import { rpc } from '@/framework/rpc'
import type { CollectionResult } from '@southneuhof/loom'
import {
  collectionCreateInputSchema,
  collectionRecordSchema,
  collectionUpdateInputSchema,
  contextDocumentListSchema,
  contextDocumentSchema,
  contextItemCreateInputSchema,
  collectionListSchema,
  collectionCapabilitiesSchema,
  contextItemUpdateInputSchema,
  contextDocumentSummarySchema,
} from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'
import type { CollectionRecord, ContextDocumentSummary, DocumentEditForm } from './skills-context.schema'

type CollectionCreateInput = (typeof collectionCreateInputSchema)['_output']
type CollectionUpdateInput = (typeof collectionUpdateInputSchema)['_output']
type ContextItemCreateInput = (typeof contextItemCreateInputSchema)['_output']

function editableItemSummary(value: unknown) {
  return contextDocumentSummarySchema.parse({ ...contextDocumentSchema.parse(value), collectionEditable: true })
}

async function list(): Promise<CollectionResult<CollectionRecord>> {
  const endpoint = rpc['cloudflare-os']['context-collections'].$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({}))
  const parsed = collectionListSchema.parse(result)
  return { data: parsed.data, meta: { total: parsed.total, page: 1, pageSize: parsed.total, totalPage: parsed.total ? 1 : 0 } }
}

async function capabilities() {
  const endpoint = rpc['cloudflare-os']['context-capabilities'].$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({}))
  return collectionCapabilitiesSchema.parse(result)
}

async function detail(id: string) {
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { collectionId: id } }))
  return collectionRecordSchema.parse(result.data)
}

async function create(input: CollectionCreateInput) {
  const endpoint = rpc['cloudflare-os']['context-collections'].$post
  const request = collectionCreateInputSchema.parse(input)
  const result = await parseHonoResponse<typeof endpoint, 201>(await endpoint({ json: request }))
  return collectionRecordSchema.parse(result.data)
}

async function update(id: string, input: CollectionUpdateInput) {
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].$patch
  const request = collectionUpdateInputSchema.parse(input)
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { collectionId: id }, json: request }))
  return collectionRecordSchema.parse(result.data)
}

async function remove(id: string) {
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].$delete
  await parseHonoResponse<typeof endpoint>(await endpoint({ param: { collectionId: id } }))
}

async function listItems(collectionId: string): Promise<CollectionResult<ContextDocumentSummary>> {
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].documents.$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { collectionId } }))
  const parsed = contextDocumentListSchema.parse(result)
  return { data: parsed.data, meta: { total: parsed.total, page: 1, pageSize: parsed.total, totalPage: parsed.total ? 1 : 0 } }
}

async function itemDetail(collectionId: string, path: string) {
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].document.$get
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { collectionId }, query: { path } }))
  return contextDocumentSchema.parse(result.data)
}

async function createItem(collectionId: string, input: ContextItemCreateInput) {
  if (input.kind === 'skill') {
    const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].skills.$post
    const result = await parseHonoResponse<typeof endpoint, 201>(await endpoint({ param: { collectionId }, json: input }))
    return editableItemSummary(result.data)
  }
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].documents.$post
  const result = await parseHonoResponse<typeof endpoint, 201>(await endpoint({ param: { collectionId }, json: input }))
  return editableItemSummary(result.data)
}

async function updateItem(collectionId: string, path: string, input: DocumentEditForm) {
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].document.$patch
  const current = await itemDetail(collectionId, path)
  const update = contextItemUpdateInputSchema.parse(input)
  if (update.kind !== (current.skillName ? 'skill' : 'document')) throw new Error('The content kind changed. Reload before editing.')
  const result = await parseHonoResponse<typeof endpoint>(await endpoint({ param: { collectionId }, query: { path }, json: update } as Parameters<typeof endpoint>[0] & { query: { path: string } }))
  return editableItemSummary(result.data)
}

async function removeItem(collectionId: string, path: string) {
  const endpoint = rpc['cloudflare-os']['context-collections'][':collectionId'].document.$delete
  await parseHonoResponse<typeof endpoint>(await endpoint({ param: { collectionId }, query: { path } }))
}

export const skillsContextActions = { list, capabilities, detail, create, update, remove, listItems, itemDetail, createItem, updateItem, removeItem }
