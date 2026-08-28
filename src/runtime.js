/**
 * runtime.js — Open ingestion + descriptive telemetry.
 * Every input, including an empty/silent input, can be represented.
 * Classification describes the signal; it does not decide whether the signal may continue.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { nowISO, uid, tokenize, roundN, clampN } from './project_unknown.js';

export const SIGNAL_TYPES = {
  silence:  { id: 'silence',  label: 'Silent / empty signal', defaultUrgency: 0 },
  text:     { id: 'text',     label: 'Text input',           defaultUrgency: 0.3 },
  query:    { id: 'query',    label: 'Query / question',     defaultUrgency: 0.5 },
  command:  { id: 'command',  label: 'Direct command',       defaultUrgency: 0.8 },
  stream:   { id: 'stream',   label: 'Streaming data',       defaultUrgency: 0.9 },
  feedback: { id: 'feedback', label: 'Feedback signal',      defaultUrgency: 0.4 },
  internal: { id: 'internal', label: 'Internal loop signal', defaultUrgency: 0.2 }
};

export const SPEED_BANDS = {
  immediate: { id: 'immediate', maxLatencyMs: 50,   yinWeight: 0.1, yangWeight: 0.9 },
  fast:      { id: 'fast',      maxLatencyMs: 250,  yinWeight: 0.3, yangWeight: 0.7 },
  normal:    { id: 'normal',    maxLatencyMs: 1000, yinWeight: 0.5, yangWeight: 0.5 },
  slow:      { id: 'slow',      maxLatencyMs: 5000, yinWeight: 0.7, yangWeight: 0.3 },
  deep:      { id: 'deep',      maxLatencyMs: null, yinWeight: 0.9, yangWeight: 0.1 }
};

export function classifySpeed(urgency = 0) {
  if (urgency >= 0.85) return SPEED_BANDS.immediate;
  if (urgency >= 0.65) return SPEED_BANDS.fast;
  if (urgency >= 0.40) return SPEED_BANDS.normal;
  if (urgency >= 0.20) return SPEED_BANDS.slow;
  return SPEED_BANDS.deep;
}

export function classifySignal(rawInput) {
  const text = String(rawInput ?? '');
  const trimmed = text.trim();
  const tokens = tokenize(trimmed);
  const lower = trimmed.toLowerCase();

  let type = trimmed.length ? SIGNAL_TYPES.text : SIGNAL_TYPES.silence;
  const queryMarkers = ['what','why','how','when','where','who','which','?'];
  const commandMarkers = ['run','execute','start','stop','reset','build','deploy','send','process'];
  const feedbackMarkers = ['feedback','adjust','correct','wrong','right','better','worse','update'];

  if (trimmed && queryMarkers.some(m => lower.includes(m))) type = SIGNAL_TYPES.query;
  if (commandMarkers.some(m => tokens.includes(m))) type = SIGNAL_TYPES.command;
  if (feedbackMarkers.some(m => tokens.includes(m))) type = SIGNAL_TYPES.feedback;

  const density = roundN(new Set(tokens).size / Math.max(tokens.length, 1));
  const urgency = roundN(clampN(type.defaultUrgency + (density - 0.5) * 0.2));
  const speed = classifySpeed(urgency);

  return {
    type: type.id,
    urgency,
    speed: speed.id,
    yinWeight: speed.yinWeight,
    yangWeight: speed.yangWeight,
    tokenCount: tokens.length,
    uniqueTokens: new Set(tokens).size,
    density,
    silent: trimmed.length === 0
  };
}

export class RuntimeTelemetry {
  constructor(filePath) {
    this.filePath = filePath;
    this.records = [];
    this.totalReceived = 0;
    this.totalProcessed = 0;
    this.avgLatencyMs = 0;
    this.load();
  }

  open(rawInput, classification) {
    const record = {
      id: uid(),
      receivedAt: nowISO(),
      rawInput: String(rawInput ?? '').slice(0, 8000),
      classification,
      startMs: Date.now(),
      closedAt: null,
      latencyMs: null,
      status: 'open'
    };
    this.records.push(record);
    this.totalReceived++;
    this.save();
    return record;
  }

  close(record, status = 'observed') {
    if (!record) return null;
    record.closedAt = nowISO();
    record.latencyMs = Date.now() - record.startMs;
    record.status = status;
    this.totalProcessed++;
    this.avgLatencyMs = roundN((this.avgLatencyMs * (this.totalProcessed - 1) + record.latencyMs) / this.totalProcessed);
    this.save();
    return record;
  }

  recent(n = 20) { return this.records.slice(-n); }

  summary() {
    const byType = {};
    const bySpeed = {};
    for (const record of this.records) {
      byType[record.classification?.type] = (byType[record.classification?.type] || 0) + 1;
      bySpeed[record.classification?.speed] = (bySpeed[record.classification?.speed] || 0) + 1;
    }
    return { totalReceived: this.totalReceived, totalProcessed: this.totalProcessed, avgLatencyMs: this.avgLatencyMs, byType, bySpeed };
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({ savedAt: nowISO(), totalReceived: this.totalReceived, totalProcessed: this.totalProcessed, avgLatencyMs: this.avgLatencyMs, records: this.records.slice(-500) }, null, 2));
    } catch {}
  }

  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8'));
      this.totalReceived = raw.totalReceived || 0;
      this.totalProcessed = raw.totalProcessed || 0;
      this.avgLatencyMs = raw.avgLatencyMs || 0;
      this.records = Array.isArray(raw.records) ? raw.records : [];
    } catch {
      this.records = [];
      this.totalReceived = 0;
      this.totalProcessed = 0;
      this.avgLatencyMs = 0;
    }
  }
}

export class RuntimeController {
  constructor(telemetryPath) {
    this.telemetry = new RuntimeTelemetry(telemetryPath);
    this.config = { maxInputLength: 8000, allowInternal: true, allowSilence: true };
  }

  receive(rawInput) {
    const text = String(rawInput ?? '').slice(0, this.config.maxInputLength);
    const classification = classifySignal(text);
    const telemetryRecord = this.telemetry.open(text, classification);
    return {
      signal: { input: text, classification, receivedAt: telemetryRecord.receivedAt, allowed: true },
      telemetryRecord,
      error: null
    };
  }

  complete(telemetryRecord, status = 'observed') {
    return this.telemetry.close(telemetryRecord, status);
  }

  status() {
    return { runtime: this.telemetry.summary(), openIngestion: true };
  }
}
