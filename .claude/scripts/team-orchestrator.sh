#!/bin/bash
# 3-AI Team Orchestration Engine
# Internal script for Claude Code to coordinate Gemini and Codex
# Usage: bash .claude/scripts/team-orchestrator.sh <phase> <context_file>

PHASE=$1
CONTEXT_FILE=$2
LOG_FILE=".claude/logs/team-collab-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p .claude/logs

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

case $PHASE in
  analyze)
    log "Phase 1: Claude analyzing requirements..."
    # Claude's analysis result is already in CONTEXT_FILE
    echo "Analysis complete. Ready for design phase."
    ;;

  design)
    log "Phase 2: Gemini designing UI/UX..."
    # Read task description
    TASK=$(cat "$CONTEXT_FILE")

    # Call Gemini via wrapper
    GEMINI_OUTPUT=$(bash .claude/scripts/ai-collab-wrapper.sh gemini design "$TASK" 2>&1)

    # Save full output to logs
    echo "$GEMINI_OUTPUT" > ".claude/logs/gemini-design-output.txt"
    log "Gemini design completed. Output saved to gemini-design-output.txt"

    # Return concise summary to Claude
    echo "Design suggestions received from Gemini (see logs for details)."
    ;;

  architecture)
    log "Phase 3: Codex reviewing architecture..."
    TASK=$(cat "$CONTEXT_FILE")

    # Call Codex architecture review
    CODEX_OUTPUT=$(bash .claude/scripts/ai-collab-wrapper.sh codex architecture "$TASK" 2>&1)

    # Save full output to logs
    echo "$CODEX_OUTPUT" > ".claude/logs/codex-architecture-output.txt"
    log "Codex architecture review completed. Output saved to codex-architecture-output.txt"

    # Return concise summary to Claude
    echo "Architecture feedback received from Codex (see logs for details)."
    ;;

  review)
    log "Phase 5: Codex reviewing implementation..."
    FILE_PATH=$(cat "$CONTEXT_FILE")

    # Validate file exists
    if [ ! -f "$FILE_PATH" ]; then
      log "ERROR: File not found: $FILE_PATH"
      echo "Error: File not found for review"
      exit 1
    fi

    # Call Codex code review
    CODEX_OUTPUT=$(bash .claude/scripts/ai-collab-wrapper.sh codex review "$FILE_PATH" 2>&1)

    # Save full output to logs
    echo "$CODEX_OUTPUT" > ".claude/logs/codex-review-output.txt"
    log "Codex code review completed. Output saved to codex-review-output.txt"

    # Return concise summary to Claude
    echo "Code review feedback received from Codex (see logs for details)."
    ;;

  *)
    echo "Unknown phase: $PHASE"
    echo "Usage: $0 <analyze|design|architecture|review> <context_file>"
    exit 1
    ;;
esac
