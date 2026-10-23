# Agent rules

- Use ASD-STE100 Simplified Technical English.
- DO NOT WRITE ANY COMMENTS in your code implementation.
- Make sure each code that you write justifies itself.
- Make sure each test that you write justifies itself. Tautological tests ARE BANNED.
- Keep changes within the user request and preserve unrelated work.
- Use destructive, production, or external writes only when the user authorizes them.
- Prefer existing code and the smallest change that meets the requirement.
- Test changed behavior with stable tests.
- Implement the current contract. Add no compatibility alias or wrapper unless the user request requires it.
- Change framework packages only when the user request explicitly includes them. Keep unsupported behavior local.
- For an update from upstream, read [the update procedure](docs/framework-sync.md#update-carta-packages-in-a-project). It defines authorization, local work protection, conflict resolution, and required checks.
- Use `$carta-audit` for a Sprindle plus Loom framework audit.
- Use `$carta-module-design` to obtain explicit approval of module behavior, then `$carta-module-development` for autonomous delivery, checks, and repair.
- Use `$api-conventions` for `apps/api` changes and `$web-ui-surfaces` for `apps/web` UI changes.
- Read [DESIGN.md](DESIGN.md) before you design, build, or review an `apps/web` page.
- Read [the resource architecture](docs/resource_system_overhaul/ARCHITECTURE.md)
  before you change Loom resource declarations, author application modules, or
  static resource checks. It defines the current API contract.
- Report failed checks, blocked work, and unverified results.
