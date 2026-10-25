# UI source review

Compare changed pages with [DESIGN.md](../../../../DESIGN.md) and approved
requirements. Check changed display/edit values, dependencies, access, imports,
navigation, and refresh ownership.

For custom submission, check rejected, completed, and uncertain write outcomes
against the [submission contract](../../../../docs/resource_system_overhaul/ARCHITECTURE.md#52-submission).

Use [$verify-carta-module](../../verify-carta-module/SKILL.md) to select runtime
proof. Standard Views, inputs, and filters use shared coverage. Check custom
value conversion at its owner; reserve browser proof for application-owned
interactions. Source review does not establish rendered behavior.
