---
name: build-resource-form
description: Build or review Carta forms and their value conversion, relation sources, and submission.
---

# Build resource forms

Use [DESIGN.md](../../../DESIGN.md) for visual conventions and the
[form guide](../../../docs/ui/forms.md) for controls and composition. Use the
[current value contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#4-schemas-and-value-ownership)
for record-to-draft mapping, defaults, and schema input/output.

Choose controls by the value and approved interaction. Use the current
[control guidance](../../../docs/ui/forms.md#select-a-field-implementation)
and component types. Read [custom fields](references/custom-field-contract.md)
when existing controls cannot express the interaction.

For relations, use the owner's authorized source and supply display labels.
Read the [web/API connection](references/backend-form-contract.md) when that
boundary changes. Resource-backed option loaders need their `resource` owner
as well as `load` and `namespace`; the owner enables invalidation. Use the
[input source contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#74-lookup-option-and-location-inputs)
for selected-record hydration and dependencies.

Distinct input contracts need distinct schemas; identical contracts can share
one. For custom submission, read the
[binding](../../../docs/resource_system_overhaul/ARCHITECTURE.md#11-required-consumption)
and [post-write contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#52-submission).
An override owns the access and invalidation behavior it replaces. Module
delivery owns verification scope.
