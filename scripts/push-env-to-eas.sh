#!/bin/bash
# Reads local .env and pushes all variables to EAS as environment variables.
# Safe for public repos — .env stays gitignored, secrets live only in EAS.
#
# Usage: ./scripts/push-env-to-eas.sh

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

echo "Pushing environment variables from $ENV_FILE to EAS (production)..."
echo ""

success=0
fail=0

while IFS= read -r line <&3 || [ -n "$line" ]; do
  # Skip empty lines and comments
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  # Split on first = only
  key="${line%%=*}"
  value="${line#*=}"

  # Trim whitespace from key
  key="${key// /}"

  # Skip if no key or value
  [[ -z "$key" || -z "$value" ]] && continue

  # Use sensitive visibility for API keys, plaintext for URLs/IDs
  visibility="sensitive"
  if [[ "$key" == *_DATABASE_URL || "$key" == *_PROJECT_ID ]]; then
    visibility="plaintext"
  fi

  echo "  Setting $key (visibility: $visibility)..."
  if npx eas env:create \
    --name "$key" \
    --value "$value" \
    --environment production \
    --visibility "$visibility" \
    --force \
    --non-interactive </dev/null 2>&1; then
    ((success++))
  else
    echo "  FAILED: $key"
    ((fail++))
  fi
  echo ""

done 3< "$ENV_FILE"

echo "Done! $success succeeded, $fail failed."
echo "Verify with: npx eas env:list production"
