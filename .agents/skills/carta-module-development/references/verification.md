# Module verification

1. Review every approved functional requirement and applicable rule against the
   implementation. Identify missing work.
2. Run required package checks for changed owners. API route changes include
   normal SDK and web type checks. Read commands from the checkout.
3. Trust unchanged framework behavior. Reuse application tests; add focused checks
   only for uncovered risks introduced by the change, through real schemas and
   operation owners.

Stop when requirements are implemented, required checks pass, and new behavior
has focused proof. Broaden only for changed shared boundaries or observed wider
defects. Reuse passes while inputs remain applicable. Diagnose repeated failures
with a specific question. Report unrelated failures; optional improvements do
not block completion.

Exclude browser tests and manual journeys; inspect aggregate commands before
use. Report rendering as unverified without compensatory checks. For changed web
wiring, use [UI review](../../web-ui-surfaces/references/verification.md).
Record commands, actual results, and gaps in delivery notes or the final report.

Before depending on an external integration, establish its contract through
current authoritative documentation or an authorized, bounded live check.
Mocks do not prove provider compatibility.
