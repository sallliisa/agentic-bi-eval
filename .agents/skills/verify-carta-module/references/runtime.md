# Runtime proof

## API launch

Run from the repository root. Dependencies must be installed. If local env
files are missing, run `pnpm setup:local` and configure the named services.
The existing test database must be disposable and distinct from development.
Migrations and seed below make an empty database usable; they do not create the
PostgreSQL service or database. No storage service is needed for these recipes.
First require port 5190 to be free (`lsof -nP -iTCP:5190 -sTCP:LISTEN`).

```sh
pnpm module:preflight -- --needs api,test
pnpm --filter @southneuhof/api routes:compile
pnpm --filter @southneuhof/api db:seed:test
export VERIFY_RUN_DIR="$PWD/.local/verification/$(date -u +%Y%m%dT%H%M%SZ)-users"
mkdir -p "$VERIFY_RUN_DIR"
cd apps/api
export API_PORT=5190 BETTER_AUTH_URL=http://127.0.0.1:5190
export SPRINDLE_ROUTE_MANIFEST=.sprindle-test/routes.mjs
node --env-file-if-exists=.env --env-file=.env.test --import tsx src/server.ts > "$VERIFY_RUN_DIR/api.log" 2>&1 &
export VERIFY_API_PID=$!
trap 'kill "$VERIFY_API_PID" 2>/dev/null; wait "$VERIFY_API_PID" 2>/dev/null || true' EXIT
```

Wait for `Listening on port 5190` in `api.log`; an exited process is a launch
failure. Use this PID only from this launch, never an unknown existing server.

One configured test database and compiled manifest are shared. Keep live proof
and API test commands serial. Different ports alone do not isolate instances.
Use separate checkouts and separately guarded databases for concurrent runs.
Recompile and restart after API, schema, dependency, or environment changes.

## Doctor

From `apps/api`, in the launch shell:

```sh
set -o pipefail
node --env-file-if-exists=.env --env-file=.env.test ../../.agents/skills/verify-carta-module/scripts/control.mjs doctor | tee "$VERIFY_RUN_DIR/doctor.jsonl"
```

This read-only check requires the owned PID, API working directory, port,
test-target guard, connected database name, seeded administrator and role,
health response, and anonymous access denial. It uses `lsof` for ownership.
Run it before driving and whenever the instance is suspect. Health alone is
insufficient. The current build and server target come from the recorded launch
and route compile, not from a server version endpoint.

## Drive and evidence

From the same shell:

```sh
node --env-file-if-exists=.env --env-file=.env.test ../../.agents/skills/verify-carta-module/scripts/control.mjs users | tee "$VERIFY_RUN_DIR/users.jsonl"
```

The executable helper drives production HTTP routes, reads persisted effects,
and removes its own rows and administrator session in `finally`. It emits
actions, statuses, assertions, and cleanup results without credentials.
Its internal SQL writes create prerequisites and perform cleanup only.
Run it for the [Users recipe](../features/users.md), not as a mandatory extra
suite beside existing equivalent route tests. Retain logs and the real command
exit status in delivery notes. A failure is not a pass because cleanup succeeds.

## Cleanup

From the launch shell, on success or failure:

```sh
kill "$VERIFY_API_PID"
wait "$VERIFY_API_PID" || true
trap - EXIT
test -s "$VERIFY_RUN_DIR/doctor.jsonl"
test -s "$VERIFY_RUN_DIR/users.jsonl"
```

Confirm that the PID no longer owns port 5190. Preserve evidence. If the helper
was forcibly terminated, use its logged fixture email and role IDs to remove
only those records, then confirm removal. Never reset the database to clean up
a proof. Seed records remain available for later runs.

## Browser proof, only when selected

Use `apps/web/playwright.config.ts` and `e2e/fixtures.ts`; do not create a second
launcher or login harness. Inspect the selected spec and preparation commands:
the default fixture runs destructive `e2e:prepare`, including database reset
and bucket clearing. Require the isolated E2E target and authority for that reset.
Run `pnpm module:preflight -- --needs api,web,browser,storage` first.

For the existing permission-switch failure case, run
`pnpm --filter @southneuhof/framework-web test:e2e -- role-mapping.spec.ts -g 'A-3 failed permission update'`.
Playwright starts and stops its servers. Local iteration flags require known
owned servers and prepared state; they do not prove server identity. Avoid
default form filling and filter journeys. Use fixture payloads through HTTP
for setup, then drive the custom interaction through real accessible controls.
Capture action and result plus relevant persisted effects. Copy selected
artifacts from `apps/web/test-results` and `apps/web/playwright-report` into the
run evidence directory before another invocation overwrites them. Report UI
paths not driven as unverified.
