---
name: web-ui-surfaces
description: Build or review Carta pages, resources, routes, navigation, and workflow controls.
---

# Web UI surfaces

Read [DESIGN.md](../../../DESIGN.md) for visual conventions.

| Work | Contract |
|---|---|
| Resources, operations, values, slots | [Architecture and compiled examples](../../../docs/resource_system_overhaul/ARCHITECTURE.md) |
| Routes, navigation, parents, Back targets | [File routing](../../../docs/architecture/file-routing.md) |
| API schemas, transport, query ownership | [Web architecture](../../../docs/architecture/web-application-architecture.md) |
| Forms and inputs | [$build-resource-form](../build-resource-form/SKILL.md) |

Use the highest-level supported composition: standard View/action, extension
point, then lower-level components. Add local code for unmet requirements.
Use View-supplied guarded callbacks in custom controls; direct resource calls
bypass mounted protections.

Normal web type checks and builds validate module navigation paths.
Use [UI review](references/verification.md) for changed wiring.
