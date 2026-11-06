#!/bin/sh
# Break-in attempts, floods and junk input, sign-in, and saved-work sync, run
# against a production build of the site with a stand-in email service.
#
# Needs: a local throwaway Postgres in DATABASE_URL with migrations applied, a
# build made with the same env (`npx next build`), and Playwright's Chromium.
# Env: DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET, RESEND_API_KEY,
#      RESEND_API_URL=http://localhost:4010, ADMIN_EMAILS=admin@example.com,
#      AUTH_TRUST_HOST=true, AUTH_URL=http://localhost:3124
set -u
mkdir -p e2e/.out
export EMAILS_FILE="${EMAILS_FILE:-e2e/.out/emails.jsonl}"
: > "$EMAILS_FILE"

node e2e/fake-resend.cjs > e2e/.out/email.log 2>&1 &
EMAIL_PID=$!
npx next start -p 3124 > e2e/.out/server.log 2>&1 &
SERVER_PID=$!
trap 'kill $EMAIL_PID $SERVER_PID 2>/dev/null' EXIT

i=0
until curl -s -o /dev/null http://localhost:3124/; do
  i=$((i + 1))
  if [ $i -gt 60 ]; then echo "server didn't start"; cat e2e/.out/server.log; exit 1; fi
  sleep 1
done

failed=""
for s in ${E2E_SCRIPTS:-security stress accounts sync}; do
  echo "── $s"
  node e2e/clear-limits.cjs || exit 1
  node "e2e/$s.cjs" || failed="$failed $s"
done

if [ -n "$failed" ]; then
  echo "FAILED:$failed"
  echo "── server log (errors)"
  grep -v '^\s*at ' e2e/.out/server.log | tail -40
  exit 1
fi
echo "All end-to-end checks passed."
