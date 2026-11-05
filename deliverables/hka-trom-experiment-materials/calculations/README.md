# Calculation files

Run `python3 calculations/reproduce.py` from the package root to calculate all 15 expected JSON values from the included case definitions, controlled rows, and filtered current master/configuration data. The program does not load expected outputs.

`calculate-original.py` is a copy of the source calculator. It uses the old `historicalExpected` object for the T7 event gate and shift selectors. `reproduce.py` resolves those selectors from the case prompt and current master data, so the packaged calculation can run without historical expected values.

`calculated-results.json` is the program output. `calculation-verification.json` records the comparison with the saved current expectations and actual run responses. `worked-calculations.md` explains the six priority cases.
