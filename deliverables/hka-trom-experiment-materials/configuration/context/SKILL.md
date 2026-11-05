---
name: "hka-trom-business-context"
description: "Interpret HKA TROM operational data and analytical requests involving transaction monitoring, traffic volume and LHR, incidents and accident causes, inspection damage, or transaction SPM/SLA compliance."
---

# HKA TROM Business Context

HKA TROM is HK Aston's operational information system for managed toll roads. Its records describe monitoring observations, traffic counts, incident handling, and asset inspections. This package supplies the institutional meanings needed to analyze those records.

## Shared context

A **section (ruas)** contains **gates (gerbang)**; a gate contains **booths (gardu)**. Reports and observations have different grains: a monitoring report, a booth sample, a traffic count, an incident, and an inspection item are different units of analysis.

Use the requested section, gate, and operational date scope. Record creation and update timestamps describe administration, not when the operational event occurred. Explicit date ranges include both endpoints. A named calendar month means that month's full calendar span; a month-to-date request has a different endpoint.

This package defines business semantics. The connected data catalogue defines available entities, fields, relationships, and access scope. Master data supplies current identities and labels; effective configuration supplies section-specific SPM/SLA parameters. Resolve names against those records and use their IDs to preserve identity. A requested output contract defines answer fields, labels, and display precision; it does not change the underlying business quantity. If necessary scope, configuration, or a business definition is unavailable or contradictory, state the gap rather than silently substituting a value.

## Domain references

Read the reference for each domain involved in the request. For a request spanning domains, use each relevant reference.

| Request concerns | Read | Contains |
|---|---|---|
| Indonesian terms, organizational scope, or record identity | [Terminology](references/terminology.md) | Shared vocabulary, master entities, dates and identifiers |
| Transaction duration, monitoring reports, or booth samples | [Transactions](references/transactions.md) | Observation grain, sample meanings, overall average |
| Vehicle volume, vehicle classes, LHR, or monthly traffic trends | [Traffic](references/traffic.md) | Counts, calendar denominator, zero-volume classes |
| Incident status, unresolved incidents, accidents, or causes | [Incidents](references/incidents.md) | Handling state and cause assignments |
| Inspection condition, damage categories, repair priorities, or asset summaries | [Inspections](references/inspections.md) | Item hierarchy, damage population, asset attribution |
| Transaction-speed SPM/SLA, failures, period status, or period comparison | [Transaction SPM/SLA](references/spm-sla.md) and [Transactions](references/transactions.md) | Evaluation grain, rule family, applicability and compliance meanings |

These references cover the listed operational domains. Other TROM modules or SPM families require their own business definitions.
