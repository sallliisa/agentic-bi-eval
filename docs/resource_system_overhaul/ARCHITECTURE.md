# Carta surface architecture

**Current contract.** This is the current authoring guide for Loom and its Carta web integration. It describes behavior in the current source. Open repair plans below record gaps. A planned target is not a shipped contract.

Use [Carta module terms](../../CONTEXT.md) for ownership language. Use the
[API schema boundary](../architecture/web-application-architecture.md#api-schema-boundary)
for backend schema imports in web code.

## Direct module authoring

| Owner | API | Author writes | Current compiled example |
|---|---|---|---|
| Backend schemas | The API module's `schema.ts` | Create, update, and select values generated from tables; operation input values | [API users schema](../../apps/api/src/routes/%28authenticated%29/users/schema.ts) |
| Web schema adapters | The web module's schema file | Collection query values and conversion for web forms | [users.schema.ts](../../apps/web/src/routes/%28authenticated%29/settings/users/users.schema.ts) |
| App transport | The app's Hono action adapter | Endpoint calls and response normalization | [users.actions.ts](../../apps/web/src/routes/%28authenticated%29/settings/users/users.actions.ts) |
| Surfaces | Loom's form, table, and detail constructors | Selected form inputs and display entries | [users.resource.ts](../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts) |
| Operations | Loom's resource binder | Supported operations, identity, permissions, routes, and page bags | [users.resource.ts](../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts) |
| Routes | Vue route files | URL state, page composition, navigation, and workflow | [users routes](../../apps/web/src/routes/%28authenticated%29/settings/users/index.route.vue) |

Use a resource for standard operation pages and declare only the operations the module supports. The route passes a complete bag to its page view. For direct Form and Table composition on a nonstandard page, see the compiled [query ownership fixture](../../apps/web/src/framework/acceptance/QueryOwnershipFixture.vue).

~~~vue
<ListView v-bind="users.list" title="Users" />
<FormView v-bind="users.create" title="Create User" />
<DetailView v-bind="users.detail({ id: userId })" />
<FormView v-bind="form" title="Edit User" />
~~~

These bindings are literal template expressions in the [users list route](../../apps/web/src/routes/%28authenticated%29/settings/users/index.route.vue), [create route](../../apps/web/src/routes/%28authenticated%29/settings/users/create.route.vue), [detail route](../../apps/web/src/routes/%28authenticated%29/settings/users/%5BuserId%5D/detail.route.vue), and [edit route](../../apps/web/src/routes/%28authenticated%29/settings/users/%5BuserId%5D/edit.route.vue). The edit route builds `form` from `users.update({ id: userId.value })` and adds route-owned confirmation behavior. The app type check compiles all four routes and the linked users module.

| Step | Write | Conditions and check |
|---|---|---|
| 1. Select behavior | Use the approved design and plan. State which operations, routes, and page behavior the module needs. | The route owns dialogs, navigation, notices, and workflow state. For nonstandard composition, see the compiled [direct Form and Table fixture](../../apps/web/src/framework/acceptance/QueryOwnershipFixture.vue). |
| 2. Define schemas and transport | Use the API module's schema values for backend create, update, and record values. Put Collection query values and web form conversion in the web module. Put app calls in its action file. | Keep input, parsed output, returned record, and query values distinct. A typed list operation needs a query schema. A route without list calls the Hono factory without options. |
| 3. Define surfaces | Use defineForm for an editor, defineTable for a collection, and defineDetail for a record display. Use only the surfaces the page needs. | Every form entry names a renderer. Tables and details use record keys; forms use input keys or explicit field bindings. The users module is the compiled example. |
| 4. Bind operations | Use one defineResource object for supported standard operations. Keep list and create bags static. Bind detail, update, and delete to a resource identity. | An update form maps the loaded record to its input draft. An update-only resource does not need a visible detail operation. |
| 5. Compose the route | Pass the resource bag to ListView, DetailView, or FormView. Let the route own page-specific workflow. | The [users list](../../apps/web/src/routes/%28authenticated%29/settings/users/index.route.vue), [create](../../apps/web/src/routes/%28authenticated%29/settings/users/create.route.vue), [detail](../../apps/web/src/routes/%28authenticated%29/settings/users/%5BuserId%5D/detail.route.vue), and [edit](../../apps/web/src/routes/%28authenticated%29/settings/users/%5BuserId%5D/edit.route.vue) routes show the current page bindings. |
| 6. Check the module | Run ordinary app lint and type checks plus focused behavior tests for changed owners. Review field and relation wiring in source. | Use [web verification](../../.agents/skills/web-ui-surfaces/references/verification.md) and the [Loom examples](../../packages/loom/README.md#executable-examples). |

## 1. Target contract

A form owns its input schema and selected inputs. A table and detail own record display maps. A resource binds app operations to those bags. Components own the props, models, events, defaults, and supported native attributes they use. A valid prop bag has the same meaning in direct use and managed use.

Definitions are plain, read-only configuration. Mounted components own state. Resource binding joins operation behavior to page bags. Vue object binding composes these contracts.

### 1.1 Required consumption

Use flat props for Form and DialogForm; the compiled [Form and DialogForm fixture](../../packages/loom/src/components/composites/__type-tests__/flat-form-components.type-test.vue) checks that contract. Use nested primitive bags for views. A later Vue prop overrides a value from v-bind. Submit is a function prop, not an event listener. Only the effective function runs; the submitted event reports its result. A submit override replaces the bound submit operation, including its access and invalidation behavior; the replacement is a new operation owned by the caller.

~~~vue
<Form v-bind="draftForm" :initial-data="{ kind: 'biasa' }" @submitted="submitted = $event" />
<FormView v-bind="users.create" title="Create User" />
<ListView v-bind="users.list" title="Users" />
~~~

The Form binding is from the compiled [query ownership fixture](../../apps/web/src/framework/acceptance/QueryOwnershipFixture.vue). The FormView and ListView bindings are literal expressions in the linked [create route](../../apps/web/src/routes/%28authenticated%29/settings/users/create.route.vue) and [users list route](../../apps/web/src/routes/%28authenticated%29/settings/users/index.route.vue). The app keeps page metadata outside the primitive bag. FormView.form, ListView.table, and DetailView.detail carry the complete primitive props they need.

### 1.2 Component boundaries

Form and DialogForm share the Form contract. DialogForm adds its presentation and close lifecycle. FormView adds page navigation and completion policy. The wrappers pass the Form slots, events, methods, and current props to one mounted Form session.

A present modelValue prop is different from an absent modelValue prop, even when its value is undefined. DialogForm's open model does not supply the Form draft model.

### 1.3 Authority and permitted derivation

| Concern | Owner |
|---|---|
| Props, native forwarding, defaults, model shape, and local input validity | The component |
| Input keys, domain validity, requiredness, and explicit input-to-command transforms | The form schema |
| Editable draft, managed bindings, validation, and submission | Form |
| Asset values, uploads, and preview URLs | The app asset service and asset-aware components |
| Read-only access and formatting | DisplayField definitions and Loom's display runtime |
| Identity, access, and cache invalidation | The resource operation |
| Page navigation and dialog lifecycle | The route and page wrapper |
| Collection query state | The controlled parent, or Collection when uncontrolled |
| HTTP query encoding and response normalization | The app transport adapter |

Form passes schema requiredness to the selected component. It does not choose a renderer, create choice data, rename component props, or convert a component model without an explicit field binding. Display accessors are synchronous and pure. Resources do not inspect fields or asset values.

## 2. Definitions and reuse

### 2.1 Construction

Constructors provide types and checks that do not need a mounted app. They do not create sessions, resolve app injection, start loads, run defaults, or parse sample data. A valid plain object has the same runtime behavior as a constructed definition.

Snapshot configuration containers. Keep schemas, components, functions, and external services by reference. Do not mutate shared definitions. Compose with object references and shallow spreads; later members replace earlier members. Use an explicit nested spread when a nested object needs a change.

### 2.2 Labels

Labels contain display text only. Resolve a label in this order: entry override, dictionary entry, then entry key. Keep an explicit empty string. A label getter is synchronous and runs in the consuming component's reactive context.

A label does not supply a renderer, format, requiredness, default, loader, or submit value. Keep labels with the definitions that use them.

### 2.3 Shared business metadata and inputs

Share business values, captions, and identity as ordinary data. Derive input choices and display options from that data. State explicitly which business values are editable. A form input fragment is an ordinary object. Check it against the form input and selected renderer, including when it comes from a variable or spread.

A behavior callback that reads another draft property declares that property in its draft context. Keep workflow-specific behavior local. Use typed functions for parameterized reuse.

### 2.4 Forms and submit ownership

A form definition contains a raw schema, an ordered map of selected inputs, and optional labels, validators, and submit. Each operation owns its own schema and selected inputs. Share a complete form only when its inputs and behavior are the same. Share fragments when only part of the form is common.

Submit receives parsed schema output. Its return type is the result reported by Form. The constructor keeps the supplied function. A resource wraps its effective submit once for access and invalidation. A later component-level override replaces that wrapper and its policy.

### 2.5 Complete display reuse

A DisplayField describes a label, a pure synchronous read function, a renderer, its authored props, and an optional format. Without read, it reads the named record property. A table column adds table behavior; a detail entry adds layout behavior. Keep the shared display fragment unchanged and spread it into both surfaces.

Constructors check the display configuration without app injection. The mounted display runtime checks the selected renderer and formatter against the installed app. A custom accessor does not make server-side sort behavior authoritative.

### 2.6 Relation names instead of identifiers

A relation label needs relation data in the returned record. Keep joined values supplied by the endpoint. If the endpoint returns only identifiers, enrich the record in its loader before rendering. Do not fetch per table cell or perform network work in a display accessor.

## 3. Public contracts

### 3.1 Form types

Keep three shapes distinct: schema input, editable FormDraft, and parsed submit output. FormDraft makes each input optional and permits null as an explicit clear. Undefined is unset. The raw schema still decides which values are valid on submit. A null draft does not make a non-nullable schema accept null.

A form field selects a top-level schema input or declares a field binding. Each field names its renderer and may define component props, span, a per-session initial-value factory, and behavior. There is no second key, source, or native-attribute bag. A props object stays under the selected component's contract. Do not widen it to an arbitrary map.

Behavior can control visibility, disabled state, props, presentation, and derived values. It reads detached draft values. Validators return issues and can run on blur or submit; they do not replace parsed schema output. A dynamic renderer must accept the same editable value contract as the original renderer. Schema validation remains authoritative when presentation changes required hints.

### 3.2 Display, table, and detail types

Table and detail schemas describe returned records. Their maps select record keys. A computed entry needs a read function. A sortable computed entry needs an explicit sort key. The query and record schemas remain separate.

Display props cannot replace values, record or field identity, setters, or validation plumbing supplied by the display surface. Required props of a renderer remain required. Table-only options do not belong on detail entries; form inputs do not extend DisplayField.

### 3.3 Renderer registration and execution

Form and display renderers have separate registries. Register actual Vue components. A component registered for both roles has independent input and display contracts. Custom renderer types use the existing augmentation points.

Form passes the component's model and validity events directly. It applies managed required, disabled, error, and identity props through the component contract. Authored props cannot replace managed state. Components that retain invalid local text report a validity error without inventing a model value.

Textarea constraints and file/image multi modes belong to their input components. Form checks that the selected input mode fits the schema, including each value shape a dynamic mode can emit.

The display path is record, property or read, format, renderer, then surface layout. Scalars render as text; nullish values render as a dash. Dates need an explicit format. Objects need an explicit display form. Keep HTML sanitized or render it as text. Display and export reuse the same read and format behavior; export does not mount Vue components. Export keeps mapValue, exclusions, filenames, and pagination. A safety limit must not report a partial export as complete.

### 3.4 Canonical props and native forwarding

Use the selected component's flat props, including only native attributes that the component forwards to its actual native target. The component owns the accepted-key list, runtime acceptance, defaults, and prop names. Component-specific props take precedence over native names.

Wrapped controls send class and style to the presentation wrapper and control attributes to the focusable element. They must reflect current props after mount. No Form-owned DOM allowlist or prop-renaming layer supplies component behavior.

### 3.5 Explicit loaders and component models

Author component props such as data, load, pick, view, namespace, searchParameters, and loadDetail on the component that owns them. A loader must match that component's argument, result, and cancellation contract. Do not infer a loader or response shape from a resource.

A direct field passes the selected component's model unchanged. For example, DateInput uses a string model. Use schema transforms to convert field values. `defineForm` checks that input and output have the same top-level keys. Use a field binding when one control reads and writes several schema properties. A separate draft shape requires explicit `mode: 'custom-draft'` and a record-to-draft loader.

## 4. Schemas and value ownership

### 4.1 Schema runtime and validation

Use raw schemas from the installed Zod dialects. Loom reads finite input keys, required keys, parses asynchronously, and normalizes issues. Metadata checks do not run defaults, refinements, or transforms. Schema input and output remain distinct.

Constructors perform context-free checks. Mounted components perform checks that need an app, renderer, formatter, query, or data source. JavaScript callers still receive runtime configuration errors; static types do not validate runtime records.

### 4.2 Requiredness

The schema owns static requiredness. Form passes it to the input component and its label. A renderer is explicit; an enum does not create choices or captions. The input component owns its default props. Schema defaults run during parsing, not when the editor opens.

### 4.3 Drafts, defaults, and records

Map record data to form input explicitly. A draft loader returns an editable input draft; it does not invert a schema transform or cast a full record to an update form. The schema parses the draft to submit output. Bind parent identities in the operation closure.

Initial values have this precedence: field default, initialData, loaded draft, then user edit. Set initialValue to a value or a zero-argument factory. Form clones editable arrays, plain objects, and Dates per session. Factories compute fresh values per session and do not run when supplied values override them. An own property with undefined, null, false, zero, or an empty string is explicit. Keep File, Blob, and opaque services by reference.

A controlled model is authoritative. Form emits initialized values instead of mutating the supplied object. It does not hydrate component values or serialize identifiers. Preserve canonical assets and selected records; put a domain transform in the declared schema.

### Field bindings

A field binding maps one control to schema properties. The draft, loader, and
submit keep the schema shape. The UI field name is not added to the draft.
Declare `binding.keys`, `read`, and `write` beside the renderer. `read` receives
a read-only draft; `write` returns exactly the declared keys. Clearing writes
`null` to all keys without calling `write`. The schema decides if null is valid.

Form applies each edit before emitting one model update. Schema errors on bound
keys appear on the UI field. Any required bound key makes the field required.
Two selected fields cannot write the same schema key. Invalid keys, overlapping
writers, and incomplete or extra write results fail with field-specific errors.
`defineForm` also checks overlapping writers and exact write-result keys at
compile time for literal key tuples. Dynamic key arrays retain runtime checks.

The compiled [pin form](../../packages/loom/src/renderers/__type-tests__/field-binding.type-test.ts)
and [component bindings](../../packages/loom/src/components/composites/__type-tests__/field-binding.type-test.vue)
show the declaration in Form, DialogForm, and a resource update. Keep names in
separate text fields; bind the location renderer to latitude and longitude.

### 4.4 Global asset service

Install one app-scoped asset service through the existing adapter. File and image controls use it for model reads, uploads, and previews. Upload returns a canonical asset value and keeps the existing signal, progress, and destination context. Preview lookup does not rewrite the model. Asset-dependent controls fail with ASSET_ADAPTER_REQUIRED when the service is missing; malformed adapter output fails with ASSET_ADAPTER_INVALID_RESULT. Separate app registrations stay isolated.

Undefined means uninitialized, null means cleared, and an empty array means an empty multi-value. A nonempty invalid asset reports an input error. Do not silently drop it or replace it with an ID, URL string, or File. Accepted user selection or upload emits a canonical asset once. Reading a value or making a preview emits no model update.

Asset mode and URL mode are distinct. Use asset or assets for service-backed previews. Use the documented URL props for a direct URL preview. Keep those source modes separate. Disabled controls block every user mutation path. An upload result applies only to the still-current control and target.

File Manager listings use ManagedAsset entries. The provider value adapter accepts and returns canonical AssetValue values for FileManagerInput, FileInput, and ImageInput. It converts at the provider boundary. Types do not validate backend responses; app schemas and AssetAdapter.read remain the runtime checks.

## 5. Form and DialogForm runtime

### 5.1 Form props, state, and events

A mounted Form needs a submit function or a present controlled draft. Its draft is the default model. Form owns one editing session and exposes a read-only draft, dirty and pending state, validate, submit, reset, and refresh. A wrapper does not create a second Form session.

Copy and freeze arrays and plain objects before exposing them. Detach Dates at the boundary. An outward mutation cannot change the private draft or its baseline. Route accepted edits, controlled replacements, resets, loaded values, and derived writes through the session owner.

A loaded value updates untouched inputs only. Reset restores the loaded or initial baseline. Refresh keeps dirty edits. A failed write keeps the draft. Schema, selected input keys, and bound identity changes start new session state; labels and compatible presentation changes keep edits.

### 5.2 Submission

A Save action supersedes pending blur validation and validates the latest settled draft. Keep one active submit attempt. Disable Save for loading, pending input work, mutation, and submit validation; blur validation alone does not disable it. A newer edit or handler change makes in-flight validation stale. Parse once, then run submit validators on parsed output. The effective handler runs once for the accepted attempt. Every input validity event obsoletes pending validation, even when its message is unchanged. Do not retry a dispatched write automatically.

Hidden controls follow the omission policy. Keep intentional schema values that have no rendered input. A hidden required value can fail at form level. Schema transforms and defaults can change parsed output. Wrappers do not parse it again. A stale session cannot accept a later completion from an older request, while the resource still completes its post-write invalidation.

When an active submit receives an uncertain or legacy error with `postWrite: true`, the mounted Form keeps the normalized error and blocks further submits for the current `(resource, id)` target. It retains the draft, emits the ordinary error event and toast once, and tells the user to check the record before another save. A binder-owned confirmed refresh failure carries the validated write result and a captured read-only recovery callback. Form keeps that error as a block, shows that the write was saved, and offers Retry refresh. A successful recovery clears only that confirmed error. It never calls the write again. Form, DialogForm, and FormView expose the state and refresh action to action slots and disable their default Submit controls; the session guard also blocks custom submit controls.

Edits, blur validation, validation, reset, ordinary refresh, controlled draft replacement, initial-data changes, schema or field changes, submit-function replacement, namespace changes, and search-parameter changes do not clear an uncertain block for the same target. A confirmed block clears only after its captured read succeeds while the session and target still match. A resource or record identity change clears the local block. A create Form without an id remains blocked until it is left or remounted, and a new Form mount starts without the local block. The local state does not provide server idempotency across remounts. A confirmed refresh failure emits the original result once with an optional refresh-error argument; FormView skips the normal success toast but still runs its completion and navigation policy, and DialogForm applies its successful-close policy. Unknown post-write failures remain conservative and do not fabricate completion.

### 5.3 Slots and accessibility

Input slots are keyed by selected field. Their values and setters use that field's FormDraft type. Outward values and nested objects are detached or read-only. Slots replace controls; they do not replace the Form session.

Form owns labels, validation state, issue focus, and managed control IDs.
BaseInput renders helper and error text after the control. It keeps both messages
visible when both are present. A raw `input:<key>` slot receives typed
`controlBindings`; bind them to the actual focusable control so the Form label
and current message links target it. Do not render validation text in the slot
or nest another message-bearing BaseInput. Keep the existing input, loading,
error, and actions slots. DialogForm and FormView use the same slot and ref
contract.

### 5.4 DialogForm parity

DialogForm adds its open state, title, description, close policy, and cancel behavior to Form. Its open model controls visibility; its default model remains the draft. A present modelValue prop stays distinct from an absent one. Reopening creates a new session and uses the current parent draft, if supplied.

Forward the current Form props, events, slots, and exposed methods. Class and style belong to the dialog root; native form attributes follow the Form contract. closeOnSubmitted defaults to true. A successful active submit can close the dialog. A cancelled or failed beforeClose check keeps it open. A stale close decision cannot close a new dialog session.

## 6. Resource composition

### 6.1 Declaration and result

Use one declaration object. Put schemas and surfaces on the operation that owns them. The list and create bags are static. Detail and update factories bind an identity. Delete returns a bound command handle. Custom commands live under actions.

A standard operation declares a permission string or null. Null removes the permission-code requirement; it does not remove resource access or row-policy checks. A custom command can use a string, a list of permission strings, null, or a permission callback. At route entry, Loom stores the resource key, the actual operation name, and a copied set of static permission codes. It checks every code with that operation. An empty set calls the access adapter with null.

A routed custom command with a static permission uses that permission for route entry. If its execution permission is a callback, declare a static `routePermission` string, nonempty list, or null. This value controls route entry only. Loom does not call the execution callback or invent its arguments at entry. `routePermission` is not valid for a static or unrouted command. At execution, `can` and `run` still use their current arguments and row policy. The API remains the final authorization boundary.

The binder returns complete View props and preserves supported page options such as filters, export, back targets, and completion callbacks. Extracting a primitive keeps its operation guard and cache behavior but does not add page navigation.

### 6.2 Binding responsibilities

The binder owns operation compatibility, access checks, bound identity, cache namespaces, write invalidation, and sibling navigation targets. It does not inspect schema fields, labels, renderers, or asset values.

Copy identity and record context before a factory or closure captures them. Check that the record identity matches the bound identity. Use that snapshot for loads, mutations, permission checks, and cache keys. A new row context needs a new binding; mutating an old record does not retarget it.

Recheck access when an operation runs. Preserve the distinction between absent row policy and malformed explicit row policy; malformed restrictions cannot grant access. Keep client permission checks separate from backend authorization. The server remains the final authorization boundary.

A successful create or update must return a valid resource identity; an update result must identify the captured target. An invalid result is an uncertain, non-retryable post-write error. If a valid write result is returned but an active read fails during invalidation, the resource reports a confirmed refresh failure with the original result and a callback that retries reads only. A canceled or superseded refresh does not change the known write outcome. The binder suppresses ordinary read failure feedback for its own refresh; the initiating surface reports one saved/refresh warning. It does not invent an identity, retry a write, or claim rollback. A stale Form session does not stop resource invalidation.

At list-table composition, the resource checks sortable columns against the non-null `sort_by` values already declared by its typed loader query. Implicit columns use their key and explicit sort keys use `sortKey`. A typed query without `sort_by` permits no server-sortable column. Broad or unbounded query types keep the existing record-key checks. The Hono adapter remains the single runtime query parser.

A bound submit uses the resource's access and invalidation behavior. Replacing it at component binding is an explicit new operation. The caller owns the replacement policy.

### 6.3 Commands and delete handles

Delete is bound to an identity and returns can, run, and route capabilities. A custom command's run and permission checks receive the same declared business arguments. Bind row context separately with withContext. It does not append the row to run arguments. A row-dependent policy denies when no row is bound.

A static routed command uses its `permission` for entry:

```ts
actions: {
  audit: {
    permission: ['records.read', 'records.audit'],
    route: { name: 'settings-users' },
    run: auditUsers,
  },
}
```

A routed command with argument-dependent execution policy names its entry rule:

```ts
actions: {
  setState: {
    permission: (id: string, enabled: boolean) => enabled ? 'records.enable' : 'records.disable',
    routePermission: 'records.read',
    route: { name: 'settings-users' },
    run: setUserState,
  },
}
```

Choose `routePermission` from the product's existing access policy. `can` and `run` continue to check the permission callback with the command arguments.

Check access again on run, even if can returned true earlier. The binder copies row context. A caller mutation cannot change the policy target.

### 6.4 Navigation and transport

FormView runs its completion callback, then applies its default navigation unless the callback prevents it or defaultTo is false. A callback or navigation failure does not repeat the write or become a validation error. Keep page completion and toast policy at the page owner.

Use the app's Hono adapter or a typed app service for transport. Keep HTTP encoding in that adapter. Do not change backend request or response contracts to fit a UI type.

## 7. Collections, views, and composite inputs

### 7.1 Table, TreeTable, Detail, and page views

Table owns one collection and query lifecycle. TreeTable keeps hierarchy and row metadata. Detail loads one record. Collection, Table, TreeTable, and Detail types require exactly one of data or load. The mounted components check own-property presence and data shape for JavaScript callers at setup and on prop updates. An empty collection is valid controlled data; Detail controlled data is a non-null record object. With the current TypeScript optional-property settings, an explicit undefined can pass an optional-never property, and the runtime own-property check rejects it.

A table schema describes returned records, not query or mutation values. The bound table loader belongs to the resource operation. Extracting a table keeps its columns, query settings, loader, and operation cache behavior. Page headings, filters, exports, and action menus stay with ListView.

A ListView delete callback needs `recordIdentity`. A ListView without a delete callback does not accept that property. A resource binder forwards its declared identity when it binds a delete operation; resource authors do not declare it again. A standalone ListView delete callback supplies the identity. The view checks and encodes that identity before a write. Its local outcome state uses the bound table resource key and canonical scalar or composite identity. A standalone view uses its identity callback as its local owner.

When a delete callback returns an uncertain or legacy error with `postWrite: true`, ListView retains the normalized error for that owner and identity. It blocks another request for that record and shows persistent guidance that the delete may have completed. A confirmed refresh failure closes the confirmation, reports one saved/refresh warning, and offers a guarded read-only Retry refresh action. It clears the block only after that read succeeds while the view and binding still match. A different record remains available. Pre-write failures show the normalized message and allow a deliberate retry. Row-action and collection slots receive a guarded callback and read-only per-record state; use that callback because a direct resource call outside ListView has no view guard.

Query changes, refresh, pagination, namespace changes, and replacement row objects do not clear an outcome for the same owner and identity. Recovery cannot repeat a delete, and concurrent recovery requests for the same mounted outcome are ignored. The state belongs to the mounted ListView and clears on unmount. A new mount starts without a local block; it does not provide server idempotency.

With a controlled query prop, the parent owns query values. Forward replacements and emit one update. Without a controlled query, Collection owns query state and URL synchronization. Do not mutate the parent query. Browser back and parent replacements update the controls without an echo loop.

TreeTable starts collapsed and renders expanded hierarchy rows with their original record context. It requires rowKey, children, and treeColumn. Use a cell slot to replace the label content while keeping the disclosure control. TreeTable and TreeTableContent share expansion state and rendering. Do not apply a display accessor or format twice.

Use TreeTableContent when a nonstandard route owns collection loading and passes
the loaded root records, query, and load state to Loom. The component keeps
TableContent's display, query, and slot behavior. It shows child rows when
their parent rows are expanded. `rowKey` values must be unique after string
normalization, and the children callback must return an array for every record.
Expansion is local by default. `expandedKeys` makes it controlled, and
`defaultExpandedKeys` sets its initial value. Do not supply both. Its
`expandAll`, `collapseAll`, and `reveal(keys)` methods change expansion state.
They do not refresh the collection or change its query. `reveal(keys)` opens
the parent rows needed to show those keys.

### 7.2 Filters

ListView filters use a submit-free form whose parsed output represents part of the table query. Form validates the draft; ListView owns query updates. Every filter declares `queryKeys`, the table-query keys it may set or clear, and `toDraft`, a synchronous mapping from raw query values to form draft values. The mapper receives `Readonly<QueryValues>` because query values can contain URL strings, arrays, missing keys, and malformed values. Check and normalize only the values that the filter uses. Do not parse the full query again or treat raw URL state as `TQuery`.

ListView merges filter defaults before the mapped draft, so an explicit `undefined` from `toDraft` clears a default. On a valid parse, it checks that every output key is in `queryKeys`, removes all owned keys from the authoritative query, merges defined parsed values, and sets `page` to `1`. An empty output clears owned keys on the first edit. Do not include `page` in `queryKeys`; ListView resets it. Search, sort, and limit keys can be owned only when they are declared. Unowned query values stay in place. A parent query replacement cancels pending validation and hydrates from the replacement without emitting a query update. Form keeps its reset behavior, and the reset draft uses the same validation and commit path.

Use an explicit reverse mapping when the draft and query use different names:

~~~ts
import { z } from 'zod'
import type { ListFilters, QueryValues } from '@southneuhof/loom'

type RoleQuery = { status?: string; page?: number }

const roleFilters: ListFilters<RoleQuery, { selection: string }> = {
  schema: z.object({ selection: z.string() }).transform(({ selection }) => selection === '' ? {} : { status: selection }),
  fields: { selection: { label: 'Status', renderer: 'text' } },
  defaults: { selection: '' },
  queryKeys: ['status'],
  toDraft: (query: Readonly<QueryValues>) => ({
    selection: typeof query.status === 'string' ? query.status : undefined,
  }),
}
~~~

### 7.3 TableInput

Editable TableInput has a table definition, a separate submit-free form definition, and an explicit record-to-draft function. Its form schema output is the stored row type. It owns row data and insert/replace behavior. The table cannot add another data source, and the row form cannot add its own submit or loader.

Read-only TableInput needs a table and a model only. Add and edit use DialogForm with the mapped draft and a local row commit function. Keep row identity stable and preserve reorder behavior.

### 7.4 Lookup, option, and location inputs

Option inputs own their data or loader. Declare load, namespace, searchParameters, pick, and view on the component. SelectInput, RadioGroupInput, and CheckboxGroupInput also accept an optional resource owner. Set it to the resource key when the loader comes from a resource. Resource writes then invalidate its option data. Keep namespace for query-instance identity; it does not identify the resource. Standalone loaders can omit resource, and static data does not need it. A static data list is the full valid-value set. A remote page does not prove that a selected value is invalid. Keep surviving values, extra fields, and order. Emit only when the component's canonical value changes.

A custom input that owns a custom data set uses `useLoader`. The installed query client owns shared reads, lifecycle cancellation, retries, and one terminal failure notification for the active read. `enabled` controls whether the loader runs; interaction `disabled` remains separate. This read feedback does not cover the independent LookupInput, location, or file-manager loaders.

A source-context change includes resource owner, loader identity, namespace, searchParameters, source mode, and identity props. A resource owner change follows the existing context-change behavior; refreshing options for the same owner does not clear a valid remote selection. SelectInput multi/asWhole, CheckboxGroupInput uniqueIDAs, and LookupInput multi affect model interpretation. A changed SelectInput picked-key identity affects selection validity; a view-only change does not. A context-driven clear is a normal model update and does not mark the input touched. A cleared value stays clear after component defaults run.

Search and page changes do not change selection validity. LookupInput uses loadDetail to validate a remote single selection after its source changes. A matching record keeps the value; a missing or mismatched record clears it. A detail error keeps the value and exposes retry. Without loadDetail, a remote single selection clears on source-context change. A remote multi-selection clears because one returned page cannot prove membership.

Keep remote hydration separate from staged edits. Observe a changed model and changed source context together so the parent model wins. A late response cannot replace a newer selection. A loader error preserves the current value for retry.

LocationInput emits `{ lat, lng }` or `null`. It does not edit names or emit provider labels. Its form uses an explicit raw schema and renderer. Keep cancellation and stale-callback checks at the input.

### 7.5 Frontend transport query boundary

Define one raw query schema for the frontend Collection values, including endpoint-specific filters and allowed sort keys. Pass it to the Hono adapter when the typed route has a list operation. A route without list calls the factory without options. The returned actions include only operations present in the typed Hono route. The adapter parses list queries asynchronously before dispatch, merges searchParameters with parsed query values taking precedence, maps sort_by to the wire sort key and sort to wire order, then uses the existing HTTP serializer. It keeps false and zero, preserves arrays, objects, and signal identity, and applies the existing empty-value omission. Invalid values prevent dispatch. Do not mutate inputs or feed wire names back into Collection. The resource table binds the adapter loader directly; do not parse the same query again on the table. A different endpoint protocol needs an explicit adapter.

## 8. Implementation ownership

| Behavior | Source owner | Example or check |
|---|---|---|
| Form types and session | [forms contracts](../../packages/loom/src/contracts/forms.ts), [form session](../../packages/loom/src/forms/useFormSession.ts) | [form parity browser test](../../packages/loom/src/components/composites/__tests__/SurfaceParity.browser.spec.ts) |
| Input props and models | The selected component under packages/loom/src/components/inputs | [select/form parity test](../../packages/loom/src/components/composites/__tests__/SelectForm.browser.spec.ts) |
| Display resolution | [display runtime](../../packages/loom/src/display/resolveDisplay.ts), table and detail constructors | [display parity test](../../packages/loom/src/components/core/__tests__/DisplayParity.browser.spec.ts) |
| Resource binding | [resource binder](../../packages/loom/src/resources/bindResource.ts), [resource types](../../packages/loom/src/resources/operations.ts) | [users module](../../apps/web/src/routes/%28authenticated%29/settings/users/users.resource.ts) |
| ListView delete outcomes | [ListView](../../packages/loom/src/components/views/ListView.vue) and [view contracts](../../packages/loom/src/contracts/views.ts) | [mounted delete outcome tests](../../packages/loom/src/components/views/__tests__/views.spec.ts) |
| Query and transport | [Hono actions](../../apps/web/src/framework/hono/actions.ts) and the app query schema | [users actions](../../apps/web/src/routes/%28authenticated%29/settings/users/users.actions.ts) |
| Resource route entry | [Loom route registry](../../packages/loom/src/resources/routeAccess.ts) and [the app route guard](../../apps/web/src/router/guards.ts) | [route requirement tests](../../packages/loom/src/resources/__tests__/boundResource.spec.ts) and [guard tests](../../apps/web/src/router/__tests__/guards.spec.ts) |
| Asset values | Loom's asset contracts and the app's installed asset adapter | [asset parity test](../../packages/loom/src/assets/__tests__/AssetParity.browser.spec.ts) |

Extend the existing input or display registry for a new component. Keep form and display contracts separate. Put domain value transforms in a schema or explicit loader. Add shared mechanics only when more than one real owner uses them.

## 9. Blast radius and removal

### 9.1 Required migration inventory

The current authoring guide starts above. The migration inventory is historical evidence in the [architecture snapshot](history/architecture-before-current-guide.md#91-required-migration-inventory). It does not define current work.

### 9.2 Delete replaced paths

The completed migration and its removal ledger remain in the [historical snapshot](history/architecture-before-current-guide.md#92-delete-replaced-paths). Use the current owner map and repair limits above for current contracts.

## 10. Type and runtime verification

### 10.1 Type boundaries

Use the Loom package type check for component and resource contracts. Use the web app type check for module schemas, actions, resource bags, and routes. The users files linked above are real compiled examples. A source check or type check proves only its boundary; it does not prove browser behavior or API authorization.

### 10.2 Runtime diagnostics

Run the architecture gate after a contract or authoring-guide change. For a changed application module, run web lint and type checks plus focused tests for the changed owner. Read each diagnostic at its declared boundary. These checks do not validate external records or prove a server access policy.

### 10.3 Decisive integration tests

Use the existing compiled browser fixtures for direct and managed component behavior. The [Loom examples table](../../packages/loom/README.md#executable-examples) links to the current form, renderer, asset, display, and row-editor fixtures. Use the app route and resource source links above for module-level examples.

### 10.4 CI and active examples

Run these existing checks from the repository root:

~~~sh
pnpm test:surface-architecture
node --test scripts/web-validation-workflow.test.mjs
pnpm --filter @southneuhof/loom exec vue-tsc --noEmit --incremental false -p tsconfig.json
pnpm --filter @southneuhof/framework-web type-check
git diff --check
~~~

The architecture gate checks the active contract and real source. The CI contract test checks workflow selection. The two type checks compile Loom and app contracts. The web workflow also runs package unit and browser tests for their changed owners.

## 11. Execution and completion

Implementation order and completion records belong to the [historical architecture snapshot](history/architecture-before-current-guide.md#11-execution-and-completion). The current path above is for authoring and verifying current app modules.

## Technical references

These sources explain language and framework behavior. The contracts above define Carta's current behavior.

- R1 — Vue binding order: https://v3-migration.vuejs.org/breaking-changes/v-bind.html
- R2 — Vue TypeScript and SFC prop conversion: https://vuejs.org/guide/typescript/composition-api.html
- R3 — Zod input/output and asynchronous parsing: https://zod.dev/basics
- R4 — TypeScript satisfies: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- R5 — Vue attribute forwarding: https://vuejs.org/guide/components/attrs
- R6 — Vue app-level dependency provision: https://vuejs.org/guide/components/provide-inject
