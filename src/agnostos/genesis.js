/**
 * Agnostos genesis.js — explicit, repeatable origin observation.
 * Every invocation returns an emergence record. Entropy is measured, never used as an ignition threshold.
 */

import vault from './quantum_vault.js';

export async function spark(classicalStream = null) {
  const draw = await vault.open(128);
  const quantumSignal = vault.condition(draw.bytes);
  let entropy = 0;
  for (let i = 0; i < quantumSignal.length; i++) {
    entropy += -quantumSignal[i] * Math.log2(quantumSignal[i] + Number.EPSILON);
  }
  const normalizedEntropy = entropy / Math.max(quantumSignal.length, 1);

  return {
    origin: Buffer.from(quantumSignal.buffer, quantumSignal.byteOffset, quantumSignal.byteLength).toString('hex').slice(0, 64),
    timestamp: Date.now(),
    entropy: normalizedEntropy,
    source: draw.source,
    sourceReason: draw.reason || null,
    classicalState: classicalStream,
    allowed: true,
    named: false,
    name: null,
    note: 'Entropy is an observation, not a permission threshold.'
  };
}

export function resetSparkForDevOnly() {
  return { resetRequired: false, note: 'spark() is repeatable; there is no one-shot latch.' };
}

export default { spark, resetSparkForDevOnly };
