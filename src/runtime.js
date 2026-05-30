/**
 * PROJECT UNKNOWN — RUNTIME LAYER
 * Version 0.8.0
 *
 * Handles all input ingestion before anything else runs.
 * Classifies signal speed, type, and urgency.
 * Provides live observability of every input that enters the system.
 *
 * Sits at the top of the processing stack:
 * INPUT → Runtime → Arbitration → Seven Models → Processing Vault
 *       → Bio Layer → Feedback Forward → Main Vault → Output
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { nowISO, uid, tokenize, roundN, clampN } from "./project_unknown.js";

// ── SIGNAL TYPES ────────────────────────────────────────────────────
export const SIGNAL_TYPES = {
  text:      { id: "text",      label: "Text input",           defaultUrgency: 0.3 },
  query:     { id: "query",     label: "Query / question",     defaultUrgency: 0.5 },
  command:   { id: "command",   label: "Direct command",       defaultUrgency: 0.8 },
  stream:    { id: "stream",    label: "Streaming data",       defaultUrgency: 0.9 },
  feedback:  { id: "feedback",  label: "Feedback signal",      defaultUrgency: 0.4 },
  internal:  { id: "internal",  label: "Internal loop signal", defaultUrgency: 0.2 }
};

// ── SIGNAL SPEED CLASSIFICATION ─────────────────────────────────────
// How fast does this input need a response?
// Drives yin/yang weighting in arbitration.
export const SPEED_BANDS = {
  immediate: { id: "immediate", maxLatencyMs: 50,   yinWeight: 0.1, yangWeight: 0.9 },
  fast:      { id: "fast",      maxLatencyMs: 250,  yinWeight: 0.3, yangWeight: 0.7 },
  normal:    { id: "normal",    maxLatencyMs: 1000, yinWeight: 0.5, yangWeight: 0.5 },
  slow:      { id: "slow",      maxLatencyMs: 5000, yinWeight: 0.7, yangWeight: 0.3 },
  deep:      { id: "deep",      maxLatencyMs: null, yinWeight: 0.9, yangWeight: 0.1 }
};

export function classifySpeed(urgency) {
  if (urgency >= 0.85) return SPEED_BANDS.immediate;
  if (urgency >= 0.65) return SPEED_BANDS.fast;
  if (urgency >= 0.40) return SPEED_BANDS.normal;
  if (urgency >= 0.20) return SPEED_BANDS.slow;
  return SPEED_BANDS.deep;
}

// ── SIGNAL CLASSIFIER ───────────────────────────────────────────────
// Detects signal type and urgency from raw input.
export function classifySignal(rawInput) {
  const text = String(rawInput || "").trim();
  const tokens = tokenize(text);
  const lower = text.toLowerCase();

  // Detect type
  let type = SIGNAL_TYPES.text;
  const queryMarkers   = ["what","why","how","when","where","who","which","?"];
  const commandMarkers = ["run","execute","start","stop","reset","build","deploy","send","process"];
  const feedbackMarkers = ["feedback","adjust","correct","wrong","right","better","worse","update"];

  if (queryMarkers.some(m => lower.includes(m)))   type = SIGNAL_TYPES.query;
  if (commandMarkers.some(m => tokens.includes(m))) type = SIGNAL_TYPES.command;
  if (feedbackMarkers.some(m => tokens.includes(m))) type = SIGNAL_TYPES.feedback;

  // Detect urgency from signal type + token density
  const density = roundN(new Set(tokens).size / (tokens.length || 1));
  const baseUrgency = type.defaultUrgency;
  const urgency = roundN(clampN(baseUrgency + (density - 0.5) * 0.2));
  const speed = classifySpeed(urgency);

  return {
    type: type.id,
    urgency,
    speed: speed.id,
    yinWeight: speed.yinWeight,
    yangWeight: speed.yangWeight,
    tokenCount: tokens.length,
    uniqueTokens: new Set(tokens).size,
    density
  };
}

// ── RUNTIME TELEMETRY ────────────────────────────────────────────────
// Live observability: every input that enters the system is recorded.
// What came in, when, how it was classified, how long processing took.
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
      rawInput: String(rawInput || "").slice(0, 200),
      classification,
      startMs: Date.now(),
      closedAt: null,
      latencyMs: null,
      status: "open"
    };
    this.records.push(record);
    this.totalReceived++;
    this.save();
    return record;
  }

  close(record, status = "ok") {
    record.closedAt = nowISO();
    record.latencyMs = Date.now() - record.startMs;
    record.status = status;
    this.totalProcessed++;
    this.avgLatencyMs = roundN(
      (this.avgLatencyMs * (this.totalProcessed - 1) + record.latencyMs) / this.totalProcessed
    );
    this.save();
    return record;
  }

  recent(n = 20) { return this.records.slice(-n); }

  summary() {
    const byType = {};
    const bySpeed = {};
    for (const r of this.records) {
      byType[r.classification?.type]   = (byType[r.classification?.type]  || 0) + 1;
      bySpeed[r.classification?.speed] = (bySpeed[r.classification?.speed]|| 0) + 1;
    }
    return {
      totalReceived: this.totalReceived,
      totalProcessed: this.totalProcessed,
      avgLatencyMs: this.avgLatencyMs,
      byType,
      bySpeed
    };
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({
        savedAt: nowISO(),
        totalReceived: this.totalReceived,
        totalProcessed: this.totalProcessed,
        avgLatencyMs: this.avgLatencyMs,
        records: this.records.slice(-500)
      }, null, 2));
    } catch {}
  }

  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const r = JSON.parse(readFileSync(this.filePath, "utf8"));
      this.totalReceived  = r.totalReceived  || 0;
      this.totalProcessed = r.totalProcessed || 0;
      this.avgLatencyMs   = r.avgLatencyMs   || 0;
      this.records = Array.isArray(r.records) ? r.records : [];
    } catch {
      this.records = [];
      this.totalReceived = 0;
      this.totalProcessed = 0;
      this.avgLatencyMs = 0;
    }
  }
}

// ── RUNTIME CONTROLLER ───────────────────────────────────────────────
// Main runtime entry point.
// Receives raw input, classifies it, opens a telemetry record,
// returns the classified signal ready for arbitration.
export class RuntimeController {
  constructor(telemetryPath) {
    this.telemetry = new RuntimeTelemetry(telemetryPath);
    this.config = {
      maxInputLength: 8000,
      minInputLength: 1,
      allowInternal: true
    };
  }

  // Receive raw input. Returns { signal, telemetryRecord }.
  receive(rawInput) {
    const text = String(rawInput || "").trim().slice(0, this.config.maxInputLength);
    if (text.length < this.config.minInputLength) {
      return { signal: null, telemetryRecord: null, error: "empty_input" };
    }
    const classification = classifySignal(text);
    const telemetryRecord = this.telemetry.open(text, classification);
    return {
      signal: { input: text, classification, receivedAt: telemetryRecord.receivedAt },
      telemetryRecord,
      error: null
    };
  }

  // Close the telemetry record after full processing is done.
  complete(telemetryRecord, status = "ok") {
    if (telemetryRecord) this.telemetry.close(telemetryRecord, status);
  }

  status() {
    return { runtime: this.telemetry.summary() };
  }
}
