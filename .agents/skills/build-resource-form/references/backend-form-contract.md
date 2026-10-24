# Web/API connection

Use [$api-conventions](../../api-conventions/SKILL.md) for backend changes and
[web architecture](../../../../docs/architecture/web-application-architecture.md)
for schemas and transport.

Relation detail must resolve authorized selections outside the current list
page. The design distinguishes retaining inactive selections from choosing new ones.

Lookup `list-*` and `detail-*` access can differ from management-screen access.
The server resolves identity, parent membership, state, and labels; the picker
does not authorize writes.

Use [public records](../../api-conventions/references/public-records.md) for
selected objects and files.
