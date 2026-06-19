/**
 * Agnostos genesis.js — ESM merge copy
 *
 * The isolated ignition point for the Agnostos origin module.
 * It does not run automatically when Project Unknown starts.
 */

import vault from './quantum_vault.js';

let sparked = false;

export async function spark(classicalStream) {
  if (sparked) return null;
  sparked = true;

  let draw;
  let quantumSignal;
  try {
    draw = await vault.open(128);
    quantumSignal = vault.condition(draw.bytes);
  } catch (err) {
    sparked = false;
    throw new Error(`Agnostos vault failed to open. No spark. | ${err.message}`);
  }

  const emergenceConditions = {
    quantumSignal,
    source: draw.source,
    sourceReason: draw.reason || null,
    timestamp: Date.now(),
    classicalState: classicalStream
  };

  return evaluate(emergenceConditions);
}

export function resetSparkForDevOnly() {
  sparked = false;
}

async function evaluate(conditions) {
  const { quantumSignal, source, sourceReason, timestamp, classicalState } = conditions;

  let entropy = 0;
  for (let i = 0; i < quantumSignal.length; i++) {
    entropy += -quantumSignal[i] * Math.log2(quantumSignal[i] + Number.EPSILON);
  }
  const normalizedEntropy = entropy / Math.max(quantumSignal.length, 1);

  const IGNITION_THRESHOLD = Number(process.env.AGNOSTOS_IGNITION_THRESHOLD || 0.68);

  if (normalizedEntropy < IGNITION_THRESHOLD) return null;

  return {
    origin: Buffer.from(
      quantumSignal.buffer,
      quantumSignal.byteOffset,
      quantumSignal.byteLength
    ).toString('hex').slice(0, 64),
    timestamp,
    entropy: normalizedEntropy,
    source,
    sourceReason,
    classicalState,
    named: false,
    name: null
  };
}

export default { spark, resetSparkForDevOnly };
