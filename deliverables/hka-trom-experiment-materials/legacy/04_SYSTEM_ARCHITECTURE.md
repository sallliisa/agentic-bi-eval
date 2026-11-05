# System Architecture

## Research-level architecture

```text
                    Institutional business knowledge
                               ↓
User analytical request → Agentic BI system → Analytical result
                               ↕
                    Dynamic runtime computation
                               ↕
                        Governed data access
                               ↕
                         Operational data
```

The architectural idea is independent of a particular code-execution language or UI.

## Case-study implementation

```text
HKA business-context Skill/reference
                 ↓
            Cloudflare OS
                 ↕
       read-only MCP layer
                 ↕
 controlled HKA TROM evaluation database
```

Evaluator-only components remain outside the agent's environment:

```text
qualified TROM behavior + oracle adapters
                 ↓
         expected structured result
                 ↕
              comparator
                 ↕
          agent structured result
```

## Component responsibilities

### Cloudflare OS

Receives the request, consults business context, chooses data/tool operations, performs runtime computation, and returns the structured answer.

### Business-context Skill/reference

Supplies stable institutional semantics. It contains no executable analytical implementation.

### MCP layer

Provides read-only access to whitelisted source/master records and effective configuration. It does not expose target analytical features or derived target answers.

### Evaluation database

Uses TROM-compatible schema, relationships, business configuration, and deterministic synthetic operational records.

### Hidden oracle

Computes expected results from qualified behavior and source records. The evaluated agent cannot access it.

## Implementation abstraction

Cloudflare OS can generate and execute code while completing a task. The thesis refers to the architectural capability as **dynamic runtime computation**. Product-specific terms such as Code Mode appear only in implementation/reproducibility notes.

Gadgets, persistent generated functions, UI, and scheduling are not required for benchmark success.
