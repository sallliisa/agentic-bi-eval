# Database scope and relationships

## Data location

The 15 cases use one shared HKA TROM database: `hkatrom_bi`, schema `public`. The case records and source records do not use separate `snap_*` or `api_*` schemas. The tool catalogue exposed public tables and views.

The test data contains 237 controlled rows in 15 operational tables. The rows are synthetic and use IDs in the 1,600,000,000 range. The one shared employee row is named `Synthetic Experiment Support`; its direct personal fields are empty. The package does not contain the full operational snapshot or the fixture ID map.

The exact controlled rows are in `controlled-fixture-rows.json`. The focused table schema is in `public-schema-relevant.json`, with a diagram in `ERD.mmd`. `current-effective-configuration.json` contains only master rows needed by these cases. It omits contact fields and unrelated operational rows.

A read-only live verification on 2026-11-01 checked all 237 controlled rows and recalculated all 15 answers. It also read four non-fixture rows in broad date scopes (one incident, two actions, and one report). Those rows did not change any of the 15 calculated answers. They are not in this package.

## Operational tables

| Case family | Main relations |
|---|---|
| T1 transaction duration | `monitoring_transactions`, `monitoring_transaction_details` |
| T2 and T3 traffic volume and LHR | `toll_volume_revenue`, `toll_traffic_volumes` |
| T4 incident status | `incidents`, `incident_actions` |
| T5 accident causes | `incidents`, `accident_reports` |
| T6 inspections | `inspection_schedules`, `inspection_schedule_assets`, `inspections`, `inspection_elements`, `inspection_items` |
| T7 event SPM/SLA | `shift_schedules`, `monitoring_transactions`, `monitoring_transaction_details` |
| T8 and T9 period SPM/SLA | `monitoring_transactions`, `monitoring_transaction_details` |

The cases also use `employees`, `shift_schedule_personel`, and the relations listed below to resolve foreign keys or labels.

## Master and configuration relations

- `toll_sections` maps each case alias to a section ID and display name.
- `toll_gates` maps requested gates to section IDs.
- `m_section_shifts` provides active shifts and their hours.
- `m_vehicle_class` provides active vehicle classes for T2 and T3.
- `m_accident_attributes` provides cause labels for T5.
- `maintenance_asset_types` provides asset labels for T6.
- `view_section_spm_sla` provides effective SPM and SLA rules for transaction-speed codes 1–5.

The current test conditions and date ranges are in `../cases/case-scopes.json`. The full prompt in `../cases/current-test-set.json` includes the JSON Schema and output conventions.

## Relationship notes

The diagram and JSON schema mark database foreign keys separately from three logical links used by the fixture verifier. `inspections.schedule_id` to `inspection_schedules.id` and `shift_schedules.shift_id` to `m_section_shifts.id` are verifier mappings, not declared PostgreSQL foreign keys. `view_section_spm_sla.section_id` to `toll_sections.id` is a logical view link.

The TROM tool accepts field projections, filters, sort fields, and cursors. It does not accept SQL expressions or joins. The agent reads related rows through separate calls and follows these keys itself.
