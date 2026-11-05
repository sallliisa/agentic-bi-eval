# Transaction Monitoring

## Records and grain

| Entity | Meaning and relationship |
|---|---|
| `monitoring_transactions` | One monitoring report with section, gate, operational `date`, shift schedule, and declared booth counts. |
| `monitoring_transaction_details` | One recorded sample belonging to its parent report through `transaction_id`. `type` identifies the observation kind and `booth_number` identifies the booth within the report. |

`transaction_duration` measures elapsed transaction time in **seconds**. The label “transaction speed” refers to this duration; a smaller value means a faster transaction. `vehicle_queue` is a separate queue observation and is not a duration or a traffic-volume total.

`total_booth` describes the report's declared booths. It is not the number of samples. A report can contain several observations of the same booth, and different booths or reports can contain different sample counts.

## Overall average duration

The overall average transaction duration is the arithmetic mean of the matching non-null detail-level duration observations under the requested parent-report scope. Each observed duration has equal weight. Null duration contributes neither a value nor an observation to this mean. The standard summary includes matching detail types; it has no implicit `type = booth` restriction.

This quantity differs from an equally weighted mean of report averages or booth averages when sample counts differ. A request explicitly asking for those other grains has a different meaning.

The standard duration summary uses numeric zero when there are no duration observations. This is an empty-summary convention, not evidence of instantaneous service. Display precision belongs to the requested output contract.

## Booth compliance

Transaction-speed compliance uses a separate population and grain defined in [Transaction SPM/SLA](spm-sla.md). An overall section average does not establish whether each monitored booth met its service targets.
