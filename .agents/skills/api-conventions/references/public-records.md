# Public records and files

## Read shape

Use the [Sprindle conversion contract](../../../../packages/sprindle/docs/reference.md#file-routes)
for scope and route enrichment. Supply the display data the approved screen needs
without per-row queries. Scope enrichment runs per record; use batch list
hydration for additional database or remote reads.

A custom `defineRoute` must apply its own public schema; scope record enrichment
does not run for it. Keep private columns out of that public schema.

## Selection values

`selectionValues(exactItemSchema)` in `src/schema.ts` accepts selected objects
with the field's actual keys. Use `selectionQuery` for their JSON query value.
Resolve identity, membership, and current labels on the server. A filtered UI
source and client-supplied labels do not establish write authority.

## Stored files

Use `storedAssetSchema`, `storedAssetInput`, and `uploadKey` from `src/schema.ts`,
and the conversion functions in `src/storage/assets.ts`. Use `z.input` for HTTP
values and `z.output` for parsed persistence values. Reuse `storedAssetModel`
and `publicRecord` for canonical records where applicable.

Keep canonical asset objects through [form submission](../../../../docs/ui/forms.md#assets).
Reuse `src/storage/s3.ts` for storage operations. Temporary signed URLs are not
stored identities. Removing a record's association does not authorize deletion
of a shared object. Database rollback does not undo a storage write or removal.
