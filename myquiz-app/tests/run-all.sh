#!/bin/bash
# Serves the app on 127.0.0.1:8765 and runs every browser test. Usage: bash tests/run-all.sh
cd "$(dirname "$0")/.."
python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
mkdir -p tests/shots
FAIL=0
for t in e2e.js e2e-artifact.js e2e-demo.js e2e-v2.js e2e-v3.js e2e-google.js e2e-ads.js smoke.js; do
  echo "== $t"
  node "tests/$t" tests/shots > "tests/shots/$t.log" 2>&1 || FAIL=1
  grep -E "ERRORS \(|CHECKS:|SMOKE:|TEST CRASH|FAIL" "tests/shots/$t.log" | head -8
done
exit $FAIL
