# Cloudflare OS management delivery

The user approved design.md and implementation on 2026-10-29.

## Execution task

Worker: /root/cloudflare_management (GPT 6 Luna, xhigh).

Implement the four approved menus, their authenticated API adapters, permissions,
seed setup and selected proof. Cloudflare OS remains the only configuration
store. Use current RPC capabilities and standard Carta resources and forms.
Keep all changes in application code. No recursive delegation or browser tests.
Preserve all existing uncommitted runner work and imported cases.

## Acceptance

- Instructions use the deployment admin API and show global scope.
- Combined collection/document/skill CRUD respects both local permissions and
  upstream collection permissions; skill delete uses its dedicated API.
- Models include account configuration when AI Gateway is absent, and gateway
  metadata when present; no secrets reach browser responses.
- Connectors show deployment availability/resource metadata and expose no writes.
- Normal empty, denied, unavailable, failure and pending states work.
- Required API, SDK and web checks pass; bounded live reads prove current API
  compatibility; isolated collection fixtures are removed after CRUD proof.
- Parent reviews actual artifacts and evidence before acceptance.

Status: Current.

## Selected proof

- Use real authenticated routes and the migrated test database for local
  permission denial. A user without a new Cloudflare OS permission must receive
  403 before the RPC session opens.
- Mock only the Cloudflare OS Cap'n Web session boundary for denied admin and
  unavailable Context capabilities, Git-backed write refusal, and skill
  operation dispatch. Assert the API entry point and the resulting status or
  upstream method call.
- Exercise model response projection with config fields that contain secret
  values and URL credentials, query and fragment data. Assert the returned
  value excludes those fields and URL parts.
- Use the configured Cloudflare OS instance for bounded read and private
  collection CRUD proof. Do not change deployment instructions or existing
  collections.

## Delivery evidence

| Requirement | Artifact and evidence |
|---|---|
| R1 | Agent Instructions route and form use the deployment admin API and show global scope. Live read passed with text length 0. The global setter was not called. |
| R2 | Skills and Context routes and resources support collection, document, and skill CRUD, including view-only document detail. Skill updates preserve the complete Markdown frontmatter and body. Live fixture proof confirmed upstream-derived descriptions after update, then deleted the private collection. Route proof checks local denial, Git read-only behavior, remote permissions, and skill-specific methods. |
| R3 | Model Providers route and read-only resources combine account and optional gateway projections. Admin settings are read before model configs; gateway IDs are not sent to `getModelConfig`. Non-admin listings use `getAiConfig().builtInModelIds` and retain unavailable gateway metadata. Route proof checks the mixed list, config call filtering, credential stripping, and URL sanitization. |
| R4 | Connectors route and read-only resources expose inventory and resource metadata. Live read returned 20 vendors; route proof checks URL credential and query removal. |

Live proof: `.local/verification/cloudflare-management-20261029/live-probe.ts`
and `live-results.json`. The exact command was:

```sh
node --env-file=.env --import tsx /Users/gamer/Documents/school/agentic-bi-eval/.local/verification/cloudflare-management-20261029/live-probe.ts
```

The final run passed all four reads and all fixture steps. The first CRUD
attempt used `skills/verification/SKILL.md`; Cloudflare OS rejected that path
because the parent directory did not exist. The proof was corrected to use
`verification/SKILL.md`, then passed and confirmed fixture removal.

Checks passed:

- `pnpm --filter @southneuhof/api type-check` (routes build/check and TypeScript).
- `pnpm --filter @southneuhof/sdk type-check`.
- `pnpm --filter @southneuhof/framework-web type-check`.
- `pnpm --filter @southneuhof/api lint:focused -- src/cloudflare-os/management.ts 'src/routes/(authenticated)/cloudflare-os' src/authorization/catalog.ts`.
- `pnpm --filter @southneuhof/framework-web lint:focused -- src/manifest/navigation.ts 'src/routes/(authenticated)/settings/agent-instructions' 'src/routes/(authenticated)/settings/skills-context' 'src/routes/(authenticated)/settings/model-providers' 'src/routes/(authenticated)/settings/connectors'` (0 errors, 2 intentional `vue/no-restricted-syntax` warnings on delete row confirmation slots).
- `pnpm --filter @southneuhof/api test:focused -- 'src/routes/(authenticated)/cloudflare-os/cloudflare-os.routes.spec.ts'` (8 passed; migrated isolated test DB).
- `git diff --check` (passed).

The first web lint run failed on formatting and an unused collection-loader
parameter. Formatting and the unused parameter were corrected. The remaining
delete confirmation slots keep the standard row-action location and provide
the required item name, scope, and skill supporting-file consequence before
deletion. No browser checks ran, as requested.

## Parent review corrections

- Added the standard document/skill detail operation and nested detail route.
  The route requires `view-skills-context`, renders the body through Vue text
  interpolation in a pre-wrapped `<pre>`, and returns to its collection detail.
  This keeps Markdown and literal HTML tags as plain text.
- The edit form now shows full skill Markdown, including frontmatter. The
  separate description field is hidden for skills; the API sends their body
  unchanged and keeps the existing outer description value for upstream
  parsing. The live proof confirmed that the new frontmatter description and
  body read back intact while custom `allowed-tools`, `metadata`, and
  `disable-model-invocation` fields remained present.
- The skill creation help names `verification/SKILL.md` and explains that a
  deeper skill path needs an existing parent directory.
- The mixed model regression was run red before the adapter fix. The exact
  command exited 1 with HTTP 500 when the old adapter called
  `getModelConfig('gateway-model')`. After the fix, the same command passed;
  it asserted one account row, one gateway row, and one account config lookup.

  ```sh
  pnpm --filter @southneuhof/api test:focused -- 'src/routes/(authenticated)/cloudflare-os/cloudflare-os.routes.spec.ts' -t 'lists gateway and account models without reading gateway model configs'
  ```
- The final route command above passed 8/8 tests. The final API, SDK, and web
  type checks and focused API/Web lint commands passed. Web lint retains the
  same two documented delete-confirmation warnings.
- Interim `pnpm --filter @southneuhof/framework-web type-check` runs failed
  while resolving the nested detail resource identity and discriminated skill
  form draft types. The final run passed after aligning the identity shape and
  keeping the hidden content kind in the loaded form draft.
- Live skill update proof command:

  ```sh
  node --env-file=.env --import tsx /Users/gamer/Documents/school/agentic-bi-eval/.local/verification/cloudflare-management-20261029/skill-update-probe.ts
  ```

  Run from `apps/api`. It passed create, update, description/body readback,
  delete, and absence verification. Its first invocation exited 1 because
  `zod` did not resolve from the ignored proof directory; the final script
  resolves it from the API package and passed. It made no model or browser
  calls and did not write the global instructions.

## Parent acceptance

Reviewed the backend projections, permissions, resource declarations, page
wiring, and route tests. Returned gateway model handling, missing document
read pages, and destructive skill frontmatter rewriting for correction.
Confirmed the revised text display uses escaped interpolation with pre-wrap.

Independent final checks passed: eight focused API route tests, web type check
including the SDK route contract, live reads through the delivered backend
adapter, six active development permission rows, and git diff --check.
Live reads returned one account model, twenty connector vendors, and an
available empty Context library. Owned-fixture evidence confirms live skill
metadata preservation and cleanup. The global instruction setter was checked
at the authenticated route boundary with the external RPC mocked; it was not
used against the live deployment.

API health and web preview respond HTTP 200 on ports 5182 and 5183. Browser
rendering remains unverified by user instruction. Existing runner records and
unrelated work were retained. No commit or push was made.

## Menu and header correction

The user requested a separate plain Card header for Agent Instructions, with
its form retained in a second content Card. The page has no NavigationHeader.
Test Sets and Test Runs now belong to the Test Runner group at /test-runner;
Skills and Context is standalone at /skills-context. Their route names and
links follow the current file routing contract. Agent Instructions, Model
Providers, and Connectors remain in Settings. No compatibility routes were added.
