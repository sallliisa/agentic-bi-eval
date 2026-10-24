---
name: carta-audit
description: Audit Sprindle and Loom against the Carta quality profile. For application module reviews, use $carta-module-development.
---

# Carta audit

Audit one declared Carta revision. Produce one completed worksheet per audit
under `audits/<date>-<commit>/CARTA-AW-1.md`. Work the audit inside the current
repository; do not edit framework behavior to pass it.

Read [references/quality-profile.md](references/quality-profile.md) first for the boundary between framework,
shared, and consumer responsibility. Read
[references/quality-requirements.md](references/quality-requirements.md) for the GATE set. Read
[references/quality-measures.md](references/quality-measures.md) for the measure registry and ratified
budgets. Copy [references/audit-worksheet.md](references/audit-worksheet.md) into the audit folder and fill
that copy.

## 1. Open

Create `audits/<date>-<commit>/` from the audit date and Carta commit SHA.
Copy [references/audit-worksheet.md](references/audit-worksheet.md) to `audits/YYYY-MM-DD-<short-sha>/CARTA-AW-1.md`
and fill sections A through H there. Record commit, date, auditors, toolchain
(Node 24 Active LTS, pnpm, compilers), runner class, baseline, and purpose
(routine, release, change-focused, or baseline). Stop on a missing value a
verdict depends on; a blank required budget yields `NOT VERIFIED` for its
requirement.

Confirm the profile still fits: check the reassessment triggers in
[references/quality-profile.md](references/quality-profile.md) before judging. When a trigger holds,
reassess the affected classification first and record the decision in the
audit folder.

## 2. Run each applicable row

Cover every applicable worksheet row: all GATE rows plus the ADVISORY rows
`CAR-IC-REC-01`, `CAR-IC-ENG-01`, and `CAR-FL-REP-01`. An ADVISORY finding is
recorded and prioritized but never blocks the profile verdict on its own. Score
each row `PASS`, `FAIL`, `NOT VERIFIED`, or permitted `N/A`, with evidence
and remediation. For worksheet section 9, confirm each `OUT` item against its
reassessment trigger and record `OUT retained` or the reclassification; never
assume. `NOT VERIFIED` is non-passing for a GATE row.

Name the folder `audits/YYYY-MM-DD-<short-sha>/`, using the full SHA in
section A when a tag is absent.

Run automatable checks with repository commands from a clean checkout.
Framework scope is `packages/sprindle` and `packages/loom` only:

- `pnpm install --frozen-lockfile`, then package-scoped
  `pnpm --filter @southneuhof/sprindle <lint|type-check|test>` and
  `pnpm --filter @southneuhof/loom <lint|type-check|test>`;
- Loom browser rows use `pnpm --filter @southneuhof/loom test:browser`
  (Playwright/Chromium); Sprindle DB-backed rows use the `apps/api`
  `db:migrate` fixture with declared services only.
- Record the exact command, commit, and relevant working-tree state.

Rows that name an external fixture or policy define it in the audit folder
when no repository source exists yet: `PERFORMANCE-FIXTURES` for
`CAR-PE-CAP-01`, `COMPATIBILITY-AND-SUPPORT` matrix cells for `CAR-CO-INT-01`,
`ACCESSIBILITY-PROFILE` cases for `CAR-IC-OPE-01` and `CAR-IC-INC-01`, and
`PUBLIC-API-POLICY` for `CAR-MA-MODIF-02`. A row whose fixture or policy is
still undefined is `NOT VERIFIED`, never assumed.

Run expert-review rows with the worksheet prompts and the measure template in
[references/quality-measures.md](references/quality-measures.md): prescribed questions, sampled paths,
contradicting evidence, consumer impact, verdict, and finding. A vague
statement such as "architecture looks clean" is not evidence.

## 3. Judge by the boundary

Fail Carta only when its primitive, invariant, wrapper, type contract,
default behavior, or extension seam makes the property unsafe, incorrect,
unusable, or impractical for consumers. Do not fail Carta for a consumer
application gap listed in the worksheet scope guardrails. Record approved
exceptions with requirement, reason, risk, compensating control, owner,
expiry, and approval in the findings register; an exception does not convert
a technical failure into `PASS`.

## 4. Close

Complete the summary table, findings register, and evaluator statement in the
audit copy. Carta satisfies the profile only when every applicable GATE is
`PASS`. Report the release decision (`Allow`, `Block`, or `Allow with
approved exception`) plus every failed check, blocked row, and unverified
result.
