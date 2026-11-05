import { defineDetail, defineForm, defineResource, defineTable } from '@southneuhof/loom'
import { appInputPresets } from '@/configs/input-presets'
import { appLabels } from '@/configs/labels'
import { collectionCreateInputSchema, collectionUpdateInputSchema, contextItemCreateInputSchema } from '@southneuhof/api/src/routes/(authenticated)/cloudflare-os/schema.ts'
import { skillsContextActions } from './skills-context.actions'
import { contextItemFormSchema, collectionRecord, contextDocumentSummary, documentEditFormSchema } from './skills-context.schema'
import { contextDocumentRecord } from './skills-context.schema'
import type { CollectionRecord, ContextDocumentSummary } from './skills-context.schema'

const collectionLabels = {
  ...appLabels,
  id: 'ID',
  title: 'Title',
  description: 'Description',
  visibility: 'Visibility',
  source: 'Source',
  documentCount: 'Documents',
  createdAt: 'Created',
  updatedAt: 'Updated',
}
const itemLabels = { ...appLabels, kind: 'Kind', path: 'Path', name: 'Name', description: 'Description', contentType: 'Content Type', body: 'Content', skillName: 'Skill', lastUpdated: 'Updated' }

const collectionTable = defineTable({
  schema: collectionRecord,
  labels: collectionLabels,
  columns: {
    title: { sortable: true },
    description: {},
    visibility: {},
    source: {},
    documentCount: {},
    updatedAt: { class: 'min-w-max whitespace-nowrap' },
  },
})
const collectionDetail = defineDetail({
  schema: collectionRecord,
  labels: collectionLabels,
  fields: {
    id: {},
    title: {},
    description: {},
    visibility: {},
    source: {},
    documentCount: {},
    createdAt: { format: 'datetime' },
    updatedAt: { format: 'datetime' },
  },
})
const collectionCreateForm = defineForm({
  schema: collectionCreateInputSchema,
  labels: collectionLabels,
  fields: {
    title: appInputPresets.title,
    description: appInputPresets.description,
    visibility: {
      renderer: 'radio',
      initialValue: () => 'private',
      props: {
        data: [
          { id: 'private', name: 'Private' },
          { id: 'public', name: 'Public' },
        ],
      },
    },
    icon: { renderer: 'text' },
  },
  submit: skillsContextActions.create,
})
const collectionUpdateForm = defineForm({
  schema: collectionUpdateInputSchema,
  labels: collectionLabels,
  fields: { title: appInputPresets.title, description: appInputPresets.description, icon: { renderer: 'text' } },
})

export const contextCollections = defineResource({
  key: 'cloudflare-os-context-collections',
  identity: (record: CollectionRecord) => record.id,
  list: {
    permission: 'view-skills-context',
    route: { name: 'skills-context' },
    table: { ...collectionTable, load: skillsContextActions.list },
  },
  create: {
    permission: 'manage-skills-context',
    route: { name: 'skills-context-create' },
    form: collectionCreateForm,
  },
  detail: {
    permission: 'view-skills-context',
    route: { name: 'skills-context-detail', params: (id) => ({ collectionId: String(id) }) },
    title: 'Collection',
    detail: () => ({ ...collectionDetail, load: ({ id }) => skillsContextActions.detail(String(id)) }),
  },
  update: {
    permission: 'manage-skills-context',
    visible: ({ record }) => record === undefined || (record.source === 'web' && record.canEdit),
    route: { name: 'skills-context-detail-edit', params: (id) => ({ collectionId: String(id) }) },
    form: ({ id }) => ({
      ...collectionUpdateForm,
      load: async () => {
        const record = await skillsContextActions.detail(String(id))
        if (record.source !== 'web' || !record.canEdit) throw new Error('This collection is read-only.')
        return { title: record.title, description: record.description, ...(record.icon ? { icon: record.icon } : {}) }
      },
      submit: (input: (typeof collectionUpdateInputSchema)['_output']) => skillsContextActions.update(String(id), input),
    }),
  },
  delete: {
    permission: 'manage-skills-context',
    visible: ({ record }) => record === undefined || (record.source === 'web' && record.canDelete),
    run: skillsContextActions.remove,
  },
})

export function contextItemsForCollection(collectionId: string) {
  const itemDetail = defineDetail({
    schema: contextDocumentRecord,
    labels: itemLabels,
    fields: { path: {}, description: {}, contentType: {}, body: {} },
  })
  const itemTable = defineTable({
    schema: contextDocumentSummary,
    labels: itemLabels,
    columns: {
      path: {},
      name: {},
      skillName: {},
      description: {},
      contentType: {},
      lastUpdated: { class: 'min-w-max whitespace-nowrap' },
    },
  })
  const itemCreateForm = defineForm({
    schema: contextItemFormSchema,
    labels: itemLabels,
    fields: {
      kind: {
        renderer: 'radio',
        initialValue: () => 'document',
        props: {
          data: [
            { id: 'document', name: 'Document' },
            { id: 'skill', name: 'Skill' },
          ],
        },
      },
      path: { renderer: 'text' },
      name: { renderer: 'text', behavior: { visible: ({ draft }) => draft.kind === 'skill' } },
      description: { renderer: 'textarea' },
      contentType: { renderer: 'text', initialValue: () => 'text/markdown', behavior: { visible: ({ draft }) => draft.kind === 'document' } },
      body: { renderer: 'textarea', props: { rows: 18 } },
    },
    submit: (input) => skillsContextActions.createItem(collectionId, contextItemCreateInputSchema.parse(input)),
  })
  const itemUpdateForm = defineForm({
    schema: documentEditFormSchema,
    labels: itemLabels,
    fields: {
      description: { renderer: 'textarea', behavior: { visible: ({ draft }) => draft.kind === 'document' } },
      body: { renderer: 'textarea', props: { rows: 22 } },
    },
  })
  return defineResource({
    key: `cloudflare-os-context-items-${collectionId}`,
    identity: (record: { path: string; collectionEditable?: boolean }) => record.path,
    list: {
      permission: 'view-skills-context',
      table: { ...itemTable, load: () => skillsContextActions.listItems(collectionId) },
    },
    detail: {
      permission: 'view-skills-context',
      route: { name: 'skills-context-detail-documents-detail', params: (path) => ({ collectionId, documentKey: String(path) }) },
      backTo: { name: 'skills-context-detail', params: { collectionId } },
      title: 'Context Item',
      detail: () => ({ ...itemDetail, load: ({ id }) => skillsContextActions.itemDetail(collectionId, String(id)) }),
    },
    create: {
      permission: 'manage-skills-context',
      route: { name: 'skills-context-detail-documents-create', params: { collectionId } },
      form: itemCreateForm,
    },
    update: {
      permission: 'manage-skills-context',
      visible: ({ record }) => record === undefined || record.collectionEditable === true,
      route: { name: 'skills-context-detail-documents-edit', params: (path) => ({ collectionId, documentKey: String(path) }) },
      form: ({ id }) => ({
        ...itemUpdateForm,
        load: async () => {
          const collection = await skillsContextActions.detail(collectionId)
          if (collection.source !== 'web' || !collection.canEdit) throw new Error('This collection is read-only.')
          const record = await skillsContextActions.itemDetail(collectionId, String(id))
          return {
            kind: record.skillName ? ('skill' as const) : ('document' as const),
            description: record.description,
            body: record.body,
          }
        },
        submit: (input: (typeof documentEditFormSchema)['_output']) => skillsContextActions.updateItem(collectionId, String(id), input),
      }),
    },
    delete: {
      permission: 'manage-skills-context',
      visible: ({ record }) => record === undefined || record.collectionEditable === true,
      run: (path) => skillsContextActions.removeItem(collectionId, String(path)),
    },
  })
}
