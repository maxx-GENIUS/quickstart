#!/usr/bin/env bash
set -e

echo "[SoroCrew] Resetting Local Soroban Standalone Docker Node..."

if ! command -v docker &> /dev/null; then
    echo "Error: 'docker' command was not found in your PATH."
    exit 1
fi

echo "[SoroCrew] Tearing down existing containers and volumes..."
docker compose down -v --remove-orphans || true

echo "[SoroCrew] Starting fresh Standalone Soroban instance..."
docker compose up -d

echo "Waiting for local Horizon & Soroban RPC healthcheck at http://localhost:8000 ..."
attempts=0
max_attempts=30
until curl -s -f http://localhost:8000/health > /dev/null; do
  attempts=$((attempts + 1))
  if [ $attempts -ge $max_attempts ]; then
    echo " Timeout waiting for local node healthcheck."
    exit 1
  fi
  sleep 2
  echo -n "."
done

echo ""
echo "Local Soroban Standalone Network ledger state has been RESET."
echo "--------------------------------------------------------"
echo "  Horizon REST Endpoint: http://localhost:8000"
echo "  Soroban RPC Endpoint: http://localhost:8000/soroban/rpc"
echo "  Friendbot Faucet:     http://localhost:8000/friendbot"
echo "  Ledger State:         CLEAN SLATE (Sequence #1)"
echo "--------------------------------------------------------"
