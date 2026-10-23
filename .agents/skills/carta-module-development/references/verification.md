# Module verification

Verification has three responsibilities:

1. Review every approved functional requirement against the implementation and
   its applicable rules. Account for missing work. This does not require a new
   test for each requirement.
2. Run required checks for changed owners. Use normal package commands from the
   checkout; API route changes also need normal SDK and web type checks. Trust
   unchanged framework behavior.
3. Check new application behavior that existing proof does not cover. Each
   additional check addresses a concrete risk introduced by this change. Use
   real schemas and operations for that boundary and reuse suitable existing tests.

Stop when the design review finds no missing work, required checks pass, and
focused checks cover the new application behavior. Broaden checks only for a
changed shared boundary or a failure that reveals a wider defect. Reuse passes
while relevant inputs remain unchanged. Investigate repeated failures with a
specific diagnostic question; report unrelated failures without expanding scope.
Optional improvements do not prevent completion.

Module delivery excludes browser tests and manual browser journeys. Inspect
aggregate commands before use. Report rendering as unverified without extending
verification to compensate. Use [UI review](../../web-ui-surfaces/references/verification.md)
for changed web wiring. Keep commands, actual results, and gaps in delivery notes
or the final report, separate from requirements.

For external integrations, establish the selected provider contract through
current authoritative documentation or an authorized, bounded live check before
dependent work. A mock does not prove provider compatibility.
