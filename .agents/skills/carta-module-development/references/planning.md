# Delivery planning

Use a plan when it helps execution or resume, or when the user requests one.
Start with one `plan.md` beside the design. Split only for work that can be
executed independently. Keep these sections:

```markdown
# Delivery plan: <Module>

Design: [design.md](design.md)

## 1. Work order

- [ ] <Specific implementation task>
  - Owners: <Files or modules to change>
  - Depends on: <Earlier task, only when needed>

## 2. Technical notes and blockers

- <Technical choice or discovery needed to finish the remaining work.>
- Blocked: <Affected task, missing dependency, and next action.>
```

Order tasks by dependency and use a size that makes progress visible without
listing individual coding steps. Reference functional requirement numbers when
they help identify the work. Keep requirement definitions in the design.

Include setup or a specific check as a task when it affects work order, resolves
an uncertainty, or is easy to overlook. Normal check commands remain in the
repository. Mark tasks from actual results and revise affected tasks when the
design changes. Keep current execution notes; Git holds history.
