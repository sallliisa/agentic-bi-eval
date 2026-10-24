# Backend file routing

Use Sprindle's [file-route contract](../../../../packages/sprindle/docs/reference.md#file-routes)
for paths, inheritance, hooks, and exports. Normal commands generate routes;
there is no manual registry.

Keep shared identity and authorization in their owning scope and operation
policy in the route. Moving a route changes URLs and inherited access; check
consumers.

Import `RouteContract` as a type from `@southneuhof/api/routes-contract`.
Web schema imports follow the [API schema boundary](../../../../docs/architecture/web-application-architecture.md#api-schema-boundary).
