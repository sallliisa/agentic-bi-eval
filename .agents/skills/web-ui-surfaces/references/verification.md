# UI source review

Review changed page composition against [DESIGN.md](../../../../DESIGN.md) and
the approved functional requirements. Check readable values, edit loading,
field dependencies, action access, imports, navigation, and refresh ownership
where they changed. Types and lint do not prove that the chosen values and
operations satisfy the business requirement.

For custom submit coordination, use the current
[submission contract](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#52-submission)
to distinguish rejection from a completed or uncertain write. Source review
establishes wiring; rendering remains unverified. Module delivery owns test
selection and its stopping point.
