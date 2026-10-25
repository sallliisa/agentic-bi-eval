---
name: test-audit
description: Gate new or changed tests and audit existing tests for independent value, duplicate coverage, and test-only production code.
---

# Test value

## Authoring gate

Before writing or changing a test, establish:

1. The observable application rule or independent contract it protects.
2. A plausible incorrect implementation that its assertion would detect.
3. The gap in framework guarantees, types, and existing coverage, and why this
   boundary is the cheapest reliable proof.
4. A production entry point that needs no test-only export, flag, setter,
   wrapper, or endpoint.

A missing answer means do not add the test. Extend existing cases where useful.
Each contract has one primary test owner; another layer needs a distinct risk.
For application modules, use [proof selection](../verify-carta-module/SKILL.md).
No test count, coverage target, or test file is required per module.

## Independent proof

- Derive expected results from the approved rule or external contract, not the
  function under test, its output, or a copy of its algorithm.
- Fixtures establish preconditions. The production action produces the claimed
  outcome. Check persisted effects through a fresh read of the real store.
- Run the real owner. Mock only an external system at an existing production
  boundary; the mock must not implement the rule being asserted.
- Make fixtures distinguish correct from incorrect behavior: multiple sessions
  for all-session revocation, matching and non-matching rows for filtering.
- For rejection, satisfy other prerequisites, assert the intended error, and
  check unchanged state. Use a valid control when an unrelated failure could
  explain the rejection.
- A bug regression must fail before the fix for the intended reason and pass
  after it. For consequential or doubtful new proof, disable one relevant
  behavior temporarily and require the assertion to fail. Restore the exact
  artifact and rerun. A whole-suite mutation campaign is not required.

## Reject low-value tests

Reject self-comparisons, copied field/export inventories, expected values
computed by the tested helper, assertion-free probes, implementation call
shapes, mocks supplying the asserted result, fixture-supplied final outcomes,
and duplicate framework or owner coverage. A behavior-preserving internal
refactor should not require changing a behavior test.

Retain source or byte inspection only for an independent contract that survives
identifier-only refactoring, such as an external protocol key or published
path. Keep call ordering only when the order is observable behavior. Slow or
static alone does not make an existing test disposable.

## Audit existing tests

Read the complete test, production owner, callers, overlapping coverage,
relevant history, and CI selection before deletion. Record the contract, actual
failure detected, remaining proof or reason none is needed, and removal risk in
existing work notes. Preserve uncertain cases. A baseline failure may be a
product defect; it is not a deletion reason.

Consolidate distinct assertions at the owning boundary. Remove test-only
production code only after checking all callers. Keep unrelated cleanup out of
scope. For an explicitly requested whole-subsystem audit, use
[the campaign procedure](CAMPAIGN.md).

## Validation and handoff

Keep shared database runs serial and source stable while tests execute. Use
package scripts and scoped AGENTS.md instructions; no alternate Vitest launcher
is needed. Run affected retained tests and required checks. For removed source
checks, exercise the real command or boundary they claimed to protect.

Review the final test diff against this gate, then run `git diff --check`.
Report actual checks, removed or consolidated contracts, remaining proof, and
failures. Commit, push, or open a PR only within the user's authorized scope.
