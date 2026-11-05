# Terminology and Scope

## Operational vocabulary

| Term | Meaning in this package |
|---|---|
| Ruas / section | Managed toll-road section; the organizational scope for reports and section-specific service targets. |
| Gerbang / gate | Toll gate belonging to a section. |
| Gardu / booth | A numbered toll booth observed within a transaction-monitoring report. A booth number alone is not a global identifier. |
| Shift | Operational shift associated with a monitoring report through a dated, section-specific shift schedule. |
| Monitoring transaksi | A report containing sampled transaction-duration and queue observations; it is not a ledger of every paid toll transaction. |
| Golongan kendaraan / vehicle class | Configured vehicle classification used to group traffic counts. |
| LHR / Lalu Lintas Harian Rata-rata | Average daily traffic volume over a calendar period; its denominator is defined in [Traffic](traffic.md). |
| Insiden / incident | Recorded operational event with zero or more handling actions. An accident is an incident identified by the accident flag. |
| Tindakan penanganan / handling action | An incident response action carrying its own progress stage. |
| Inspeksi / inspection | Inspection event containing elements and their recorded inspection items. |
| Aset / asset | Inspection/maintenance asset-master entry identified through the inspection's scheduled asset assignment; see [Inspections](inspections.md) for its grain. |
| SPM / Standar Pelayanan Minimal | Minimum service standard represented by configured indicators. |
| SLA / Service Level Agreement | Section-specific service target whose applicability is configured per indicator. |

## Master identities

`toll_sections` and `toll_gates` identify the managed scope. `shift_schedules` identifies dated monitoring shifts; `m_section_shifts` defines section shift numbers and default hours; `m_vehicle_class` identifies traffic classifications. Names, short names, and codes are labels for their master IDs, not independent entities. Current master records determine the available sections, gates, shifts, and classes.

A shift number can recur on different dates and in different sections. `monitoring_transactions.schedule_id` identifies the dated `shift_schedules.id` assignment. Its `shift` field is the operational shift number. `shift_schedules.shift_id` is a logical link to `m_section_shifts.id`; the catalogue does not declare it as a foreign key. A shift number alone does not identify a monitoring event.

Entity names in this package refer to the governed data catalogue. Available fields and their exact spellings come from that catalogue; production storage names can differ.

## Dates and relationships

Operational date belongs to the parent event: monitoring report, traffic report, incident, or inspection. Child records inherit that event's scope through their documented relationship. In production TROM, the incident's operational date is named `accident_date`, including for incidents that are not accidents.

A field named `transaction_id` is local to its domain: monitoring details belong to a monitoring report, while traffic-volume details belong to a traffic report. Equal numeric IDs across these domains do not establish a relationship.

Reports at the same gate and date can still be distinct events. Preserve event IDs when describing observations or failures; names and dates alone may not identify a unique record.
