# Web/API connection

Use [$api-conventions](../../api-conventions/SKILL.md) for backend changes and the
[web application architecture](../../../../docs/architecture/web-application-architecture.md)
for schemas and transport.

Use the relation owner's list/detail source. Detail must resolve an authorized
selected record outside the current list page. The approved design settles
whether an existing inactive selection can remain without allowing a new one.

Lookup access uses API `list-*` and `detail-*` permissions and can differ from
access to the owner's management screen. The server resolves submitted identity,
parent membership, current state, and labels; the picker does not authorize a write.

Use the app's [public-record boundary](../../api-conventions/references/public-records.md)
for selected object arrays and stored files.
