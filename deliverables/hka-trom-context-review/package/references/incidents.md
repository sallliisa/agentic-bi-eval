# Incidents and Accident Causes

## Records and scope

| Entity | Meaning and relationship |
|---|---|
| `incidents` | One operational incident, carrying section, incident date, identity, description, and accident flag. |
| `incident_actions` | A handling action belonging to an incident through `incident_id`; an incident can have zero or several actions. |
| `accident_reports` | Accident detail associated with an incident through `incident_id`, including recorded cause IDs. |
| `m_accident_attributes` | Identities and labels for accident attributes referenced by the report's cause assignments. |

Incident and accident-cause reporting use the parent incident's section and operational date. `is_accident` is a boolean classification, not an accident category or cause.

## Handling status

Handling-action stage `100` means complete. Any other stage, including null, is incomplete.

| Incident's handling actions | Incident status |
|---|---|
| No actions recorded | Under investigation |
| At least one incomplete action | Under investigation |
| At least one action, with every action complete | Closed |

“Unresolved” means under investigation. Production labels include `on_investigation` and `close`; “under investigation” and “closed” express those business states. Report approval or verification status is a separate concept.

Incident totals count incident identities, irrespective of the number of actions. Under-investigation and closed counts partition the incident population. A list of unresolved incidents describes that same under-investigation population.

## Accident-cause distribution

Only incidents with `is_accident = true` contribute accident-cause assignments. A report can record multiple causes. Each recorded cause assignment contributes to its cause's count, including repeated assignments of the same cause; this is not a distinct-accident count. The sum of cause counts can exceed the number of accidents.

The production report stores its cause collection as `accident_causes_ids`; use the catalogue's exposed representation of that collection. Cause labels come from the associated attribute master records. The attribute catalogue can contain other kinds of accident attributes; the cause collection determines which attributes are being counted here.

An accident without a recorded cause contributes no cause assignment. A cause distribution therefore describes recorded assignments, not a mutually exclusive partition of all incidents or all accidents.
