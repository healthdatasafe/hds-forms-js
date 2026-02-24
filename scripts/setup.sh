#!/bin/bash
set -e

echo "=== hds-forms setup ==="

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js >= 20 required (found $(node -v))"
  exit 1
fi

echo "Node $(node -v) OK"

# Install dependencies
npm install

# Setup dev environment (pre-commit hook)
SETUP_DEV_ENV="./scripts/setup-dev-env.sh"
if [ -f "$SETUP_DEV_ENV" ]; then
  sh "$SETUP_DEV_ENV"
else
  echo "Note: no setup-dev-env.sh found, skipping pre-commit hook setup"
fi

echo "=== Setup complete ==="
