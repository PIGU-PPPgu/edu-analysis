# Quality Standards

## Test Command

```bash
npm test -- --run
```

## Lint Command

```bash
npm run lint
```

## Requirements

- Minimum test coverage: 80%
- All tests must pass before PR
- No lint errors
- No type errors (if applicable)

## Test Strategy

- Unit tests for pure functions and business logic
- Integration tests for API endpoints
- Do NOT mock the database in integration tests

## Definition of Done

A task is done when:
1. Feature works as described in acceptance criteria
2. Tests written and passing
3. No new lint errors
4. PR created with description of changes
