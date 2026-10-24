---
name: build-resource-form
description: Build or review Carta forms, value conversion, relation sources, and submission.
---

# Build resource forms

Read [DESIGN.md](../../../DESIGN.md) for layout. Use the [form guide](../../../docs/ui/forms.md)
for controls and composition, and the [value contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#4-schemas-and-value-ownership)
for drafts, defaults, and schema input/output. Identical input contracts can
share schemas.

Use [custom fields](references/custom-field-contract.md) for interactions
existing controls cannot express.

For relations, use authorized owner sources with display labels. Read the
[web/API connection](references/backend-form-contract.md) when changing that
boundary. Pass `resource` with `load` and `namespace` so resource writes invalidate
options. For hydration and dependencies, read the
[input source contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#74-lookup-option-and-location-inputs).

Submit overrides replace access and invalidation. Follow the
[binding](../../../docs/resource_system_overhaul/ARCHITECTURE.md#11-required-consumption)
and [post-write contracts](../../../docs/resource_system_overhaul/ARCHITECTURE.md#52-submission).
