Create a git commit following project standards: $ARGUMENTS

Steps:
1. Run `git status` and `git diff` to see changes
2. Apply Git Workflow Skill commit message format
3. Generate a proper commit message based on changes:
   - Format: `<type>(<scope>): <subject>`
   - Types: feat, fix, docs, style, refactor, perf, test, chore
   - Scopes: ui, db, api, auth, report, grade, homework
4. If $ARGUMENTS is provided, use it as additional context
5. Execute `git add .` and `git commit` with the generated message
6. Show the commit result
