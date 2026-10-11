#!/usr/bin/env node

const { execSync } = require('child_process');
const http = require('http');

const command = process.argv[2] || 'help';

console.log('[SoroCrew CLI v0.1.0] - Local Soroban Orchestrator\n');

function isDockerAvailable() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function waitForHealthcheck(maxAttempts = 30) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get('http://localhost:8000/health', (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (attempts < maxAttempts) {
          process.stdout.write('.');
          setTimeout(check, 2000);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => {
        if (attempts < maxAttempts) {
          process.stdout.write('.');
          setTimeout(check, 2000);
        } else {
          resolve(false);
        }
      });
    };
    check();
  });
}

if (command === 'status') {
  if (!isDockerAvailable()) {
    console.log('Error: Docker is not installed on this system.');
    console.log('Install Docker from https://docs.docker.com/get-docker/ to run local standalone node.');
    console.log('Note: SoroCrew Studio can also connect directly to Testnet & Futurenet without Docker.\n');
  }

  const req = http.get('http://localhost:8000/health', (res) => {
    if (res.statusCode === 200) {
      console.log('Local Standalone Docker Instance is RUNNING on port 8000.');
      console.log('RPC: http://localhost:8000/soroban/rpc');
      console.log('Friendbot: http://localhost:8000/friendbot');
    } else {
      console.log(`Docker Instance returned HTTP status ${res.statusCode}.`);
    }
  });

  req.on('error', () => {
    console.log('Local Standalone Docker Instance is OFF. Run "npm start" to launch when Docker is installed.');
  });
} else if (command === 'fund') {
  const pubKey = process.argv[3];
  if (!pubKey) {
    console.error('Error: Please provide a public key. Example: sorocrew fund GAAA...');
    process.exit(1);
  }

  console.log(`Funding ${pubKey} via Friendbot...`);
  http.get(`http://localhost:8000/friendbot?addr=${encodeURIComponent(pubKey)}`, (res) => {
    if (res.statusCode === 200) {
      console.log('Successfully funded test account with 10,000 test XLM.');
    } else {
      console.log(`Friendbot error: HTTP ${res.statusCode}`);
    }
  });
} else if (command === 'reset') {
  if (!isDockerAvailable()) {
    console.error('Error: Docker is required to reset local standalone container.');
    console.error('Please install and launch Docker before executing reset.');
    process.exit(1);
  }

  console.log('[SoroCrew] Resetting local standalone node ledger state...');
  try {
    console.log('Tearing down existing containers and volumes...');
    execSync('docker compose down -v --remove-orphans', { stdio: 'inherit' });

    console.log('Starting fresh standalone node...');
    execSync('docker compose up -d', { stdio: 'inherit' });

    process.stdout.write('Waiting for local Horizon & Soroban RPC healthcheck');
    waitForHealthcheck(30).then((healthy) => {
      if (healthy) {
        console.log('\n\nLocal Soroban Standalone Network ledger state has been RESET.');
        console.log('--------------------------------------------------------');
        console.log('  Horizon REST Endpoint: http://localhost:8000');
        console.log('  Soroban RPC Endpoint: http://localhost:8000/soroban/rpc');
        console.log('  Friendbot Faucet:     http://localhost:8000/friendbot');
        console.log('  Ledger State:         CLEAN SLATE (Sequence #1)');
        console.log('--------------------------------------------------------\n');
      } else {
        console.log('\nWarning: Timed out waiting for local node healthcheck.');
      }
    });
  } catch (err) {
    console.error('Reset execution failed:', err.message);
    process.exit(1);
  }
} else {
  console.log('Usage:');
  console.log('  sorocrew status      - Check local standalone node health');
  console.log('  sorocrew fund <addr> - Fund a test keypair on local network via Friendbot');
  console.log('  sorocrew reset       - Wipe local ledger state and restart clean standalone container');
}
