# Whole-subsystem test audit

Use only for an explicitly requested broad audit. Apply the value gate in
[SKILL.md](SKILL.md); ordinary module delivery does not need this procedure.

1. Pin the baseline revision and record each in-scope test file's result.
   Keep existing failures separate from proposed removals.
2. Group tests by production owner, including shared boundary and live proof.
   Read tests, owners, history, and CI routing before assigning a disposition:
   retain, repair, consolidate, or delete.
3. For each contract, name the retained proof and the assertions to move.
   Deletion needs either stronger remaining proof or evidence that no contract
   exists. Preserve uncertain cases; line-count reduction is not the objective.
4. Apply one coherent owner batch at a time. Migrate distinct assertions before
   deleting duplicate files and unused test-only production code. Run affected
   retained tests before the next batch.
5. Compare removed coverage with retained assertions. For consequential restored
   contracts, introduce one relevant temporary fault, require failure, restore
   the exact source, and rerun. Do not edit during an active test run.
6. Run required checks on the final diff. Report baseline failures, retained
   contracts, removals, production changes, proof results, and unresolved gaps.
   Separate unrelated product defects from the audit's authorized scope.
