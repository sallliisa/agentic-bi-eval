---
name: web-ui-surfaces
description: Build or review Carta web pages, resources, file routes, navigation, and workflow controls.
---

# Web UI surfaces

Read [DESIGN.md](../../../DESIGN.md) for visual conventions and the approved
module design for behavior. Use current contracts at the changed boundary:

| Work | Read |
|---|---|
| Resources, operations, display values, slots | [Resource architecture and compiled examples](../../../docs/resource_system_overhaul/ARCHITECTURE.md) |
| Routes, navigation, retained parents, Back targets | [File routing](../../../docs/architecture/file-routing.md) |
| API schema imports, transport, query ownership | [Web application architecture](../../../docs/architecture/web-application-architecture.md) |
| Forms and user input | [$build-resource-form](../build-resource-form/SKILL.md) |

## Framework-first composition

Start with the highest-level component that supports the approved interaction:
standard View/action, supported extension point, then lower-level components.
Use local code for a requirement those components cannot meet.

An override replaces the bound prop. For submit overrides, read the current
[binding contract](../../../docs/resource_system_overhaul/ARCHITECTURE.md#11-required-consumption)
so access and invalidation stay owned. Use the guarded callbacks supplied by
Views when customizing their controls.

Route generation checks module navigation paths during normal web type checks
and builds. Use [UI review](references/verification.md) for changed application
wiring; module delivery owns verification scope.
