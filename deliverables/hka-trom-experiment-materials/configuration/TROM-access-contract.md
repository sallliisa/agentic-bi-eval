# TROM access contract

The Cloudflare OS TROM binding exposes three read-only methods:

- `list_entities()` lists public-schema tables, partition parents, views, and materialized views.
- `describe_entity(entity)` returns columns, primary keys, declared foreign keys, and supported filters for one public entity.
- `read_records(entity, fields, filters, sort, limit, cursor)` returns a projected page of records.

`read_records` combines filters with AND. It supports `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `contains`, `starts_with`, `ends_with`, `is_null`, and `is_not_null`. The default page size is 100 and the maximum is 500. The cursor is tied to the same entity, projection, filters, sort, and limit. SQL expressions, wildcard field selection, joins, and write methods are not supported.

The Cloudflare OS connector requests observation approval before each TROM read. It exposes no write method. The HKA TROM endpoints are `GET /agentic-bi/entities`, `POST /agentic-bi/describe-entity`, and `POST /agentic-bi/read-records`. Their service classes set `noAuth = true` and `transaction = false`; Cloudflare OS still requires an authenticated workspace session and mediates TROM reads as observations.

The HKA catalogue restricts relations to public-schema tables, partition parents, views, and materialized views. It does not expose partition children. The read method accepts column names, AND-combined filters, sorting, and paging. It does not accept SQL expressions or joins. The current tool type definitions are preserved in `TROM-binding-types.txt`.

This contract comes from the Cloudflare OS connector source and the HKA TROM Agentic BI service source. Chat histories show the tools in use during the selected case runs.
