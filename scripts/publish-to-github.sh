#!/usr/bin/env bash
# Creates the GitHub repo and pushes main. Requires: gh auth login
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_NAME="${1:-rxil-onboarding-demo}"
VISIBILITY="${2:-public}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in. Run: gh auth login"
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init -b main
fi

if ! git rev-parse HEAD >/dev/null 2>&1; then
  git add -A
  git commit -m "$(cat <<'EOF'
Initial commit: RXIL TReDS onboarding demo.

MongoDB Atlas Vector Search + Voyage AI for automated maker-checker verification.
EOF
)"
fi

gh repo create "$REPO_NAME" \
  --"$VISIBILITY" \
  --source=. \
  --remote=origin \
  --description "RXIL TReDS onboarding demo — MongoDB Atlas Vector Search + Voyage AI" \
  --push

echo ""
echo "Repository: $(gh repo view --json url -q .url)"
