/**
 * Agnostos bio_layer_v2.js — ESM merge copy
 * Adaptive post-spark substrate that grows temporary organs around pressure vectors.
 */

import { EventEmitter } from 'node:events';

export class Organ {
  constructor(signature, pressureVector, createdAt) {
    this.signature = signature;
    this.pressureVector = Float64Array.from(pressureVector);
    this.createdAt = createdAt;
    this.lastStimulatedAt = createdAt;
    this.energy = 1;
    this.cohesion = 1;
    this.mutation = 0;
    this.lineage = [signature];
  }

  stimulate(vector, timestamp) {
    const overlap = similarity(this.pressureVector, vector);
    const novelty = 1 - overlap;
    this.energy = Math.min(64, this.energy + overlap * 2 + novelty * 0.5);
    this.cohesion = Math.max(0.05, Math.min(1.5, this.cohesion + overlap * 0.05 - novelty * 0.02));
    this.mutation += novelty * 0.03;
    this.lastStimulatedAt = timestamp;
    this.pressureVector = blend(this.pressureVector, vector, 0.18 + novelty * 0.12);
    return { overlap, novelty };
  }

  decay(now) {
    const age = Math.max(1, now - this.lastStimulatedAt);
    this.energy *= Math.exp(-age / 120000);
    this.cohesion *= Math.exp(-age / 240000);
  }

  canPersist() {
    return this.energy > 0.08 && this.cohesion > 0.04;
  }
}

export class BioLayerV2 extends EventEmitter {
  constructor(options = {}) {
    super();
    this.organs = new Map();
    this.maxOrgans = options.maxOrgans || 32;
    this.organThreshold = options.organThreshold || 0.71;
  }

  ingest(emergence) {
    const timestamp = Date.now();
    const vector = toPressureVector(emergence);

    const ranked = [...this.organs.values()]
      .map(organ => ({ organ, score: similarity(organ.pressureVector, vector) }))
      .sort((a, b) => b.score - a.score);

    let selected = ranked[0]?.organ || null;
    let relation = ranked[0]?.score || 0;

    if (!selected || relation < this.organThreshold) {
      selected = this.spawnOrgan(vector, timestamp);
      relation = 0;
      this.emit('organ:spawned', snapshotOrgan(selected));
    } else {
      const { overlap, novelty } = selected.stimulate(vector, timestamp);
      this.emit('organ:stimulated', { organ: snapshotOrgan(selected), overlap, novelty });
    }

    this.crossCouple(vector, timestamp, selected.signature);
    this.prune(timestamp);

    const substrate = {
      timestamp,
      activeOrgan: snapshotOrgan(selected),
      organCount: this.organs.size,
      pressureVector: Array.from(vector),
      substrateTension: this.measureTension(vector),
      emergence
    };

    this.emit('substrate', substrate);
    return substrate;
  }

  spawnOrgan(vector, timestamp) {
    if (this.organs.size >= this.maxOrgans) {
      const weakest = [...this.organs.values()].sort((a, b) => (a.energy * a.cohesion) - (b.energy * b.cohesion))[0];
      if (weakest) this.organs.delete(weakest.signature);
    }
    const signature = signatureFromVector(vector, timestamp);
    const organ = new Organ(signature, vector, timestamp);
    this.organs.set(signature, organ);
    return organ;
  }

  crossCouple(vector, timestamp, activeSignature) {
    for (const organ of this.organs.values()) {
      if (organ.signature === activeSignature) continue;
      const overlap = similarity(organ.pressureVector, vector);
      if (overlap > 0.82) {
        organ.stimulate(vector, timestamp);
        organ.cohesion += 0.01;
      } else if (overlap < 0.18) {
        organ.mutation += 0.01;
      }
    }
  }

  prune(now) {
    for (const [signature, organ] of this.organs.entries()) {
      organ.decay(now);
      if (!organ.canPersist()) {
        this.organs.delete(signature);
        this.emit('organ:dissolved', { signature, timestamp: now });
      }
    }
  }

  measureTension(vector) {
    if (this.organs.size <= 1) return 1;
    const distances = [...this.organs.values()].map(organ => 1 - similarity(organ.pressureVector, vector));
    return distances.reduce((a, b) => a + b, 0) / distances.length;
  }
}

function toPressureVector(emergence) {
  const seed = [];
  const origin = String(emergence?.origin || '');
  for (let i = 0; i < origin.length; i += 2) {
    const pair = origin.slice(i, i + 2);
    if (pair.length === 2) seed.push(parseInt(pair, 16) / 255);
  }
  seed.push(Number(emergence?.entropy || 0));
  seed.push((Number(emergence?.timestamp || Date.now()) % 100000) / 100000);

  while (seed.length < 16) {
    const last = seed[seed.length - 1] || 0.5;
    seed.push((Math.sin(last * Math.PI * (seed.length + 1)) + 1) / 2);
  }

  return Float64Array.from(seed.slice(0, 16));
}

function similarity(a, b) {
  const denom = magnitude(a) * magnitude(b) || Number.EPSILON;
  return dot(a, b) / denom;
}

function blend(a, b, factor) {
  const out = new Float64Array(Math.min(a.length, b.length));
  for (let i = 0; i < out.length; i++) out[i] = a[i] * (1 - factor) + b[i] * factor;
  return out;
}

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) sum += a[i] * b[i];
  return sum;
}

function magnitude(v) {
  return Math.sqrt(dot(v, v));
}

function signatureFromVector(vector, timestamp) {
  const raw = Array.from(vector).map(v => Math.floor(v * 65535).toString(16).padStart(4, '0')).join('');
  return `organ_${timestamp.toString(36)}_${raw.slice(0, 18)}`;
}

function snapshotOrgan(organ) {
  return {
    signature: organ.signature,
    energy: organ.energy,
    cohesion: organ.cohesion,
    mutation: organ.mutation,
    lineage: [...organ.lineage],
    createdAt: organ.createdAt,
    lastStimulatedAt: organ.lastStimulatedAt,
    pressureVector: Array.from(organ.pressureVector)
  };
}

export default BioLayerV2;
