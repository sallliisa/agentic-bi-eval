# Delivery plan

Keep optional `plan.md` beside the design. Split only independently executable
work. Use these two sections:

```markdown
# Delivery plan: <Module>

Design: [design.md](design.md)

## 1. Work order

- [ ] <Implementation task>
  - Owners: <Files or modules>
  - Depends on: <Earlier task, if needed>

## 2. Technical notes and blockers

- <Technical choice or discovery needed to finish.>
- Blocked: <Task, missing dependency, next action.>
```

Order tasks by dependency. Reference design requirements instead of copying
them. Mark actual progress and revise affected tasks after design changes.
Include setup or checks only when they affect execution, resolve uncertainty,
or are easy to miss. Read routine commands from the repository.
