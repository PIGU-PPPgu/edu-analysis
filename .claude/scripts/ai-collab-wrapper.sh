#!/bin/bash
# AI Collaboration Wrapper Script for Figma Frame Faithful Project

# Set Gemini environment variables
export GOOGLE_GEMINI_BASE_URL=https://api-slb.packyapi.com
export GEMINI_API_KEY=sk-HrIF4mVe3X35OsRvEHeErSOH0PXFGoiw1BVIVrEMZ8rUpesK
export GEMINI_MODEL=gemini-3-pro-high

AI_TYPE=$1  # "gemini" or "codex"
TASK_TYPE=$2  # "design", "review", "architecture"
CONTEXT=$3  # Context string or file path

# Add JSON output support
OUTPUT_JSON=false
if [[ "$4" == "--json" ]]; then
  OUTPUT_JSON=true
fi

case $AI_TYPE in
  gemini)
    if [ "$TASK_TYPE" == "design" ]; then
      RESULT=$(echo "$CONTEXT" | gemini \
        --model gemini-3-pro-high \
        "You are a frontend UI/UX expert specializing in React + Tailwind CSS + shadcn/ui. Analyze the following requirement and provide:
1. Component structure (JSX skeleton)
2. Tailwind CSS classes for styling (using our design system tokens)
3. Interaction states (hover, focus, active)
4. Responsive design considerations
5. Accessibility (a11y) best practices

Requirement: $CONTEXT" 2>&1)

      if $OUTPUT_JSON; then
        echo "{\"ai\":\"gemini\",\"task\":\"design\",\"output\":$(echo "$RESULT" | jq -Rs .)}"
      else
        echo "$RESULT"
      fi
    fi
    ;;

  codex)
    if [ "$TASK_TYPE" == "review" ]; then
      RESULT=$(cat "$CONTEXT" | codex exec \
        -m gpt-5.1-codex \
        "You are a senior full-stack engineer reviewing code for an educational management system. Review this code for:
1. Business logic correctness (especially grade calculation and student data handling)
2. Edge cases and error handling
3. Security vulnerabilities (SQL injection, XSS, RLS policy compliance)
4. Performance optimization opportunities (caching, query optimization)
5. Code quality (naming, structure, TypeScript types, comments)
6. Database query efficiency (Supabase best practices)

Provide specific, actionable feedback." 2>&1)

      if $OUTPUT_JSON; then
        echo "{\"ai\":\"codex\",\"task\":\"review\",\"output\":$(echo "$RESULT" | jq -Rs .)}"
      else
        echo "$RESULT"
      fi

    elif [ "$TASK_TYPE" == "architecture" ]; then
      RESULT=$(echo "$CONTEXT" | codex exec \
        -m gpt-5.1-codex \
        "You are a software architect for an educational SaaS platform. Evaluate this design for:
1. Scalability (handling multiple schools/classes)
2. Maintainability
3. Separation of concerns (API layer, service layer, data layer)
4. Potential technical debt
5. Integration with Supabase (RLS, real-time subscriptions, edge functions)
6. Performance considerations (caching strategy, data fetching patterns)

Design: $CONTEXT" 2>&1)

      if $OUTPUT_JSON; then
        echo "{\"ai\":\"codex\",\"task\":\"architecture\",\"output\":$(echo "$RESULT" | jq -Rs .)}"
      else
        echo "$RESULT"
      fi
    fi
    ;;

  *)
    echo "Unknown AI type: $AI_TYPE"
    echo "Usage: $0 <gemini|codex> <design|review|architecture> <context> [--json]"
    exit 1
    ;;
esac
