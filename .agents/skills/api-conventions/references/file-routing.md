# Backend file routing

Use the Sprindle [file-route contract](../../../../packages/sprindle/docs/reference.md#file-routes)
for paths, scopes, inheritance, hooks, and method exports. Use normal project
commands; route generation is part of those commands.

`apps/api/src/routes` owns HTTP locations. Keep shared identity and authorization
at their owning scope, and operation-specific policy with the route. A move can
change both the URL and inherited access; inspect affected consumers.

Database domains are registered in `apps/api/src/domains.ts`. Permissions and
web navigation have separate owners. A route needs no manual route registry.

Import `RouteContract` as a type from `@southneuhof/api/routes-contract`. Web
runtime schema imports follow the
[API schema boundary](../../../../docs/architecture/web-application-architecture.md#api-schema-boundary).
