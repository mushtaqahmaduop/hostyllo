#!/bin/bash
# verify-pitr.sh — Phase 1 exit gate
# Confirms Supabase Point-in-Time Recovery is active.
# Exit 0 = PITR active. Exit 1 = PITR not active (block deploy).
#
# Usage:
#   ./scripts/verify-pitr.sh
#
# Required env vars:
#   SUPABASE_URL           e.g. https://eprrhckgtrerknenngdy.supabase.co
#   SUPABASE_ACCESS_TOKEN  Supabase Personal Access Token (NOT the service_role key).
#                          The Management API (api.supabase.com) authenticates with a PAT;
#                          the service_role JWT is a data-plane (PostgREST) credential and
#                          always returns 401 here — which is why this gate never passed (audit C4).
#                          Create one at https://supabase.com/dashboard/account/tokens

set -euo pipefail

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "❌ SUPABASE_URL and SUPABASE_ACCESS_TOKEN must be set (PAT, not the service_role key)"
  exit 1
fi

# Extract project ref from URL: https://<ref>.supabase.co
PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | cut -d'.' -f1)

echo "🔍 Checking PITR for project: $PROJECT_REF"

RESPONSE=$(curl -sf \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups" \
  2>&1 || true)

if echo "$RESPONSE" | grep -q '"pitr_enabled":true'; then
  echo "✅ PITR is ACTIVE — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  # Append to log for monthly audit trail
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ'): PITR OK on $PROJECT_REF" >> "$(dirname "$0")/../logs/pitr-checks.log" 2>/dev/null || true
  exit 0
else
  echo "❌ PITR is NOT active on project $PROJECT_REF"
  echo "   Go to: Supabase Dashboard → Project Settings → Add-ons → Enable Point in Time Recovery"
  echo "   Response: $RESPONSE"
  exit 1
fi