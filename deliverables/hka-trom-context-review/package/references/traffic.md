# Traffic Volume and LHR

## Records and units

| Entity | Meaning and relationship |
|---|---|
| `toll_volume_revenue` | Parent traffic report identifying section, gate, and operational `date`. |
| `toll_traffic_volumes` | Vehicle count `total` for a `vehicle_class_id`, belonging to a traffic report through `transaction_id`. |
| `m_vehicle_class` | Current class identities and labels, including classes with no volume in a requested period. |

**Total volume** is the sum of recorded vehicle counts in the requested scope, measured in **vehicles**. A count row can represent many vehicles; counting rows measures something else. Despite the parent report's name, these volume details represent vehicle counts rather than revenue.

A standard class breakdown retains every configured class, including inactive classes, with zero volume where there are no matching counts. A class's active flag does not remove it from this reporting population. Class labels and identities come from master data.

## Average daily traffic

**LHR** is total volume divided by the number of calendar days in the inclusive requested period, rounded to the nearest whole number. Its unit is **vehicles per day**. For nonnegative traffic values, a half rounds upward.

Calendar days without traffic records remain in the denominator and contribute zero recorded volume. This reporting convention does not establish that no vehicles physically used the road on an unreported day.

For class-specific LHR, the numerator is that class's volume and the denominator is the same calendar-day span. Overall LHR uses total volume before rounding; summing rounded class LHRs can differ from the rounded overall value.

## Monthly trends

Each requested complete calendar month has its own volume and LHR. The denominator is the number of days in that month, including days without reports. Months and configured classes with no matching volume retain zero values. A partial-month request instead uses its explicitly requested inclusive dates.

These definitions describe ordinary traffic volume and LHR. Weighted volume and “LHR tertimbang” are distinct quantities whose weighting definitions are not supplied here.
