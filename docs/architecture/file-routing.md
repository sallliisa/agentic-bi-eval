# File routing

- **Status:** Authoritative
- **Scope:** `apps/web/src/routes`

## Module navigation

`src/manifest/navigation.ts` declares `kind: 'module'` or `kind: 'standalone'`.
Module targets use static `/<name>/<submodule>` URLs, such as `/settings/users`;
record pages extend that path. Module landing pages need a submodule folder:
`sales/sell/index.route.vue`, not `sales/index.route.vue`.

Standalone entries declare one direct page at `/<name>`, such as `/dashboard`.
Public routes and pages outside navigation are excluded from this check.

Normal web type checks, builds, and Vite route generation validate resolved
paths, including overrides. Missing kinds, unknown targets, and invalid paths
fail with source, actual URL, and expected structure where available.

## Page placement

File placement sets the URL and the rendered parent chain. Use ordinary
folders for new child CRUD pages. A folder adds URL segments. Its
`index.route.vue` is the default page and is replaced by sibling pages.

A route file and a matching folder make a retained parent. The parent must
render `AppRouterView` or `RouterView`:

```text
users/[userId]/detail.route.vue
users/[userId]/detail/roles/index.route.vue
users/[userId]/detail/roles/[roleId]/detail.route.vue
```

Use native dotted segments when a page must leave a rendered parent and keep
the same URL segments. The containing folder still sets higher parents:

```text
# Leave User Detail.
users/[userId]/detail.roles.[roleId].detail.route.vue

# Keep User Detail and leave Role Detail.
users/[userId]/detail/roles/[roleId]/detail.permissions.[permissionId].detail.route.vue
```

Do not keep nested and dotted forms of the same page. Generation rejects
duplicate names, duplicate paths, multiple layouts, layout collisions, and
rendered parents without an outlet. The error lists the files to correct.
An empty index child can share its parent URL. A conditional outlet is valid.

`AppRouterView` renders its default slot only when no child component matches
at that outlet depth. A matched child replaces the slot while its `Suspense`
fallback or child-owned error and access UI is active. Put content in the slot
when a child route must replace it. Put content beside the outlet when the
parent must keep it visible on child routes. Use a default `index.route.vue`
child when the content needs its own route component identity for direct links,
refresh, or Back navigation.

Tabs replace a bare parent with the first available child. They stay active
for deeper pages in their collection section. Page Back uses the resource
collection `backTo`. A workflow without a routed collection supplies an
explicit target. Browser Back uses browser history.

Changing a parent ID remounts that parent and its descendants. A child ID,
query, or hash change keeps unchanged higher parents mounted. File ancestry
does not grant access or prove API scope. Guards and API checks still apply.

Valid sibling workflows can stay flat. For example, orientation catalog,
syllabus, and quiz pages replace each other. File dots are only necessary
when a matching rendered parent must be left.

## Route access

Resource routes declare their registered key and operation. Standard operations
require a permission string or explicit `null`. `null` skips the permission-code
check; other access rules still apply.
Use `meta.permission` for routes without a resource registration.

A command with argument-dependent permission needs static `routePermission`
for entry. Execution checks arguments and row context. Static commands use their
permission directly. The API authorizes requests independently.

Router changes in `apps/web` are project-owned and need a separate reviewed
adoption in each application.
