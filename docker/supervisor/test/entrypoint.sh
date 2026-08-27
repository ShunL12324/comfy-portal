#!/usr/bin/env bash
# Serves the fixture models over loopback so the test needs no network at all,
# then hands over to the supervisor.
set -e
mkdir -p /testdata
: "${FIXTURE_MB:=8}"
head -c "$(( FIXTURE_MB * 1024 * 1024 ))" /dev/urandom > /testdata/tiny-model.safetensors
head -c 1048576 /dev/urandom > /testdata/second-model.safetensors
cd /testdata && python3 -m http.server 8000 >/dev/null 2>&1 &
sleep 0.5
exec python3 /opt/cp/supervisor.py
