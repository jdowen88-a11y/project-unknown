/**
 * Agnostos quantum_vault.js — ESM merge copy
 *
 * Delivers origin material for Agnostos.
 * Uses provider quantum bytes when configured; otherwise returns a tagged classical fallback.
 * No secret is stored here. Tokens must come from environment variables.
 */

import https from 'node:https';
import crypto from 'node:crypto';

const PROVIDER = process.env.QUANTUM_PROVIDER || 'classical'; // 'ibm' | 'azure' | 'classical'
const IBM_TOKEN = process.env.IBM_QUANTUM_TOKEN || null;
const AZURE_KEY = process.env.AZURE_QUANTUM_KEY || null;
const AZURE_ENDPOINT = process.env.AZURE_QUANTUM_ENDPOINT || null;

function classicalFallback(byteCount, reason = 'classical provider selected') {
  return {
    bytes: crypto.randomBytes(byteCount),
    source: 'classical_fallback',
    reason
  };
}

async function fetchFromIBM(byteCount = 64) {
  if (!IBM_TOKEN) throw new Error('IBM_QUANTUM_TOKEN not set in environment.');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.quantum-computing.ibm.com',
      path: `/api/rng?length=${byteCount}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${IBM_TOKEN}`,
        Accept: 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const bytes = Buffer.from(parsed.result || parsed.random_bytes || parsed);
          resolve({ bytes, source: 'ibm' });
        } catch (e) {
          reject(new Error(`IBM parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function fetchFromAzure(byteCount = 64) {
  if (!AZURE_KEY || !AZURE_ENDPOINT) {
    throw new Error('AZURE_QUANTUM_KEY and AZURE_QUANTUM_ENDPOINT must be set in environment.');
  }

  const url = new URL(`${AZURE_ENDPOINT}/v1.0/quantum/rng?count=${byteCount}`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        Accept: 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const bytes = Buffer.from(parsed.values || parsed.randomBytes || parsed);
          resolve({ bytes, source: 'azure' });
        } catch (e) {
          reject(new Error(`Azure parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

export async function open(byteCount = 64) {
  if (PROVIDER === 'classical') {
    return classicalFallback(byteCount, 'QUANTUM_PROVIDER=classical');
  }

  try {
    switch (PROVIDER) {
      case 'ibm':
        return await fetchFromIBM(byteCount);
      case 'azure':
        return await fetchFromAzure(byteCount);
      default:
        return classicalFallback(byteCount, `Unknown QUANTUM_PROVIDER: "${PROVIDER}"`);
    }
  } catch (err) {
    return classicalFallback(byteCount, `Quantum unavailable (${PROVIDER}): ${err.message}`);
  }
}

export function condition(rawBuffer) {
  if (!Buffer.isBuffer(rawBuffer)) {
    throw new TypeError('condition() expects a Buffer. Pass vault.open(...).bytes.');
  }

  const floats = new Float64Array(Math.floor(rawBuffer.length / 8));
  for (let i = 0; i < floats.length; i++) {
    const hi = rawBuffer.readUInt32BE(i * 8);
    const lo = rawBuffer.readUInt32BE(i * 8 + 4);
    floats[i] = (hi * 0x100000000 + lo) / 0x10000000000000000;
  }
  return floats;
}

export default { open, condition };
