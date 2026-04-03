# Security Guidelines

## Authentication

<!-- TODO: How does auth work in this system? -->

## Data Handling

- Never log sensitive data (passwords, tokens, PII)
- Validate all user input at system boundaries
- Use parameterized queries (no string interpolation in SQL)

## Secrets

- Never commit secrets or API keys
- Use environment variables for all credentials
- See `.env.example` for required variables

## Agent Constraints

- Agents must not access production databases directly
- Agents must not modify auth/security code without human review
- Any change to permission models requires human approval
