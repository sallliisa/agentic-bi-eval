# Custom fields

Use the current [form extension contract](../../../../docs/ui/forms.md#select-a-field-implementation)
and [slot bindings](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#53-slots-and-accessibility).
The outer Form owns the label, required state, errors, help, and grid span.

For one-form use, bind the `input:<field-key>` slot to the custom control. For
reuse as a renderer, augment `FormRendererComponents` from
`@southneuhof/loom/renderers/formContracts` with the actual component type and
register that component under the same runtime key. Its public Vue model remains
the input contract. Forward the supplied field and accessibility bindings to
the actual editable control. Reuse existing inputs for behavior they already own.
