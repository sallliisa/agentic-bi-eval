# Inspections and Asset Condition

## Record hierarchy

| Entity | Meaning and relationship |
|---|---|
| `inspections` | Inspection event with section, operational `date`, and `schedule_asset_id`. |
| `inspection_elements` | Element recorded within an inspection, linked through `inspection_id`. |
| `inspection_items` | Item observation within an element, linked through `inspection_element_id`; carries damage category and repair priority. |
| `inspection_schedule_assets` | Scheduled asset assignment referenced by the inspection; `asset_id` identifies its asset. |
| `maintenance_asset_types` | Legacy inspection/maintenance asset-master identities and labels referenced by scheduled asset assignments. |

`inspection_schedule_assets.asset_id` references `maintenance_asset_types.id` in this environment. The separate `assets` entity is not the master referenced by this relationship. Resolve the asset ID and name from the referenced master. An asset-level count measures item observations grouped by that master identity; it does not establish a count of distinct physical objects.

The item inherits section and date from its inspection. Its asset attribution comes from the inspection's scheduled asset assignment. An element or item label alone does not identify the asset.

## Damage population

For the condition summary, a **damaged item** is a recorded inspection item whose `damage_category` is non-null. That category-based definition determines the population even when other fields such as `is_damage`, inspection approval, or repair progress are present.

The unit counted is a recorded inspection item, not an inspection event, inspection element, or distinct physical asset. Repeated inspections can contribute separate item observations for the same asset. An asset-level damaged-item count consequently describes observations during the period, not the number of unique assets damaged or their latest condition.

## Category and priority

| Dimension | Codes used in the condition summary | Meaning |
|---|---|---|
| Damage category | `r1`, `r2`, `r3` | Recorded damage classifications, displayed as R1, R2, R3. |
| Repair priority | `p1`, `p2` | Recorded repair-priority classifications, displayed as P1, P2. |

Damage category and repair priority are separate classifications. A category does not by itself determine a priority. Severity descriptions and repair deadlines require an applicable business definition beyond these codes.

A damaged item without P1/P2 priority still contributes to the total damaged-item count and its category and asset counts. P1 plus P2 can therefore be less than the total. Other priority codes, where present, are outside the P1/P2 breakdown and are not automatically mapped into it.

A null damage category is outside this damage-summary population; it alone does not establish a healthy physical asset. Unknown non-null categories likewise retain their contribution to the total rather than being silently reclassified as R1, R2, or R3.
