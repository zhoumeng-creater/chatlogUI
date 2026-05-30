#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5030}"

echo "Checking sidecar at ${BASE_URL}"

curl -fsS "${BASE_URL}/health" || {
  echo "Health check failed"
  exit 1
}

echo
echo "Checking ping/db/session endpoints where available..."

curl -fsS "${BASE_URL}/api/v1/ping" || true
echo

curl -fsS "${BASE_URL}/api/v1/db" || true
echo

curl -fsS "${BASE_URL}/api/v1/sessions?limit=1" || true
echo

curl -fsS "${BASE_URL}/api/v1/stats" || true
echo

echo "Smoke check complete. Review output manually for data readiness and errors."
