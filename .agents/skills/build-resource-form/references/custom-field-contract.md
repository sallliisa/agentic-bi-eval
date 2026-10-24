# Custom fields

Use the [extension contract](../../../../docs/ui/forms.md#select-a-field-implementation)
and [slot bindings](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#53-slots-and-accessibility).
Form owns labels, required state, errors, help, and grid span.

For one form, use `input:<field-key>`. For reusable renderers, augment
`FormRendererComponents` from `@southneuhof/loom/renderers/formContracts` with the
component type and register the same key. Preserve its Vue model and forward
field/accessibility bindings to the editable control.
