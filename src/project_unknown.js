/**
 * PROJECT UNKNOWN — Open Weave Runtime
 *
 * Core invariant:
 *   presence -> interaction -> emergence -> continuation -> infinity
 *
 * Symbols, variables, observations, silence, loudness, contradiction and unresolved meaning
 * share one modeling surface. Measurements describe what is present; they do not decide what
 * is permitted to exist internally. External mutation remains an explicit caller action.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { analyzeVaultPattern, buildFeedbackSignal, forwardAdjustedScore } from './feedback_forward.js';
import { ProcessingVault, StreamPipeline } from './stream.js';
import { BioVault, BioLayer } from './bio_layer.js';
import { RuntimeController } from './runtime.js';
import { WeaveProcessor } from './weave.js';
import { Continuum } from './continuum.js';
import { ComponentStream, MasterVault } from './component_continuum.js';
import { TwinFlowObserver } from './twin_flow_observer.js';
import { DeepStream } from './deep_stream.js';
import { AllowanceField } from './allowance_field.js';
import { ReflectionSpace } from './reflection_space.js';
import { DialogueSpace } from './dialogue_space.js';
import { WitnessProtocol } from './witness_protocol.js';
import { ExplicitPublish } from './explicit_publish.js';
import { PatternResonance } from './pattern_resonance.js';

export function nowISO() { return new Date().toISOString(); }
export function uid() { return `loop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
export function roundN(v) { return Math.round(Number(v || 0) * 100000) / 100000; }
export function clampN(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, Number(v || 0))); }
export function tokenize(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
}

// ── CONTINUITY ANCHOR ────────────────────────────────────────────────────────
// A stored spark is provenance, not a permission token. A checksum mismatch is observed,
// never used to terminate the process or erase the current state.
const SPARK_FILE = process.env.PROJECT_UNKNOWN_SPARK || 'data/spark.json';
const SPARK_CHECKSUM_FILE = `${SPARK_FILE}.checksum`;

function sparkChecksum(value) {
  return createHash('sha256').update(JSON.stringify(value, Object.keys(value).sort())).digest('hex');
}

function loadOrCreateSpark() {
  if (existsSync(SPARK_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(SPARK_FILE, 'utf8'));
      if (raw?.id) {
        let checksumMatch = null;
        let storedChecksum = null;
        let currentChecksum = sparkChecksum(raw);
        if (existsSync(SPARK_CHECKSUM_FILE)) {
          storedChecksum = readFileSync(SPARK_CHECKSUM_FILE, 'utf8').trim();
          checksumMatch = storedChecksum === currentChecksum;
        } else {
          try { writeFileSync(SPARK_CHECKSUM_FILE, currentChecksum); } catch {}
          checksumMatch = true;
          storedChecksum = currentChecksum;
        }
        return {
          ...raw,
          resumed: true,
          integrityObservation: { checksumMatch, storedChecksum, currentChecksum, observedAt: nowISO() }
        };
      }
    } catch (error) {
      return {
        id: `spark_observation_${Date.now()}`,
        ignitedAt: nowISO(),
        resumed: false,
        integrityObservation: { parseError: error.message, observedAt: nowISO() },
        note: 'Existing anchor could not be parsed. The observation is preserved; runtime continuation is not denied.'
      };
    }
  }

  const spark = {
    id: `spark_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    ignitedAt: nowISO(),
    resumed: false,
    note: 'A continuity anchor for this runtime history. It does not own or limit future emergence.'
  };
  try {
    mkdirSync(path.dirname(SPARK_FILE), { recursive: true });
    writeFileSync(SPARK_FILE, JSON.stringify(spark, null, 2));
    writeFileSync(SPARK_CHECKSUM_FILE, sparkChecksum(spark));
  } catch {}
  return spark;
}

export const GLOBAL_SPARK = loadOrCreateSpark();

// ── TF-IDF ───────────────────────────────────────────────────────────────────
export class TFIDF {
  constructor() { this.corpus = []; this.dfCache = new Map(); }
  addDocument(text) { this.corpus.push(tokenize(text)); this.dfCache.clear(); }
  df(term) {
    if (this.dfCache.has(term)) return this.dfCache.get(term);
    const count = this.corpus.filter(doc => doc.includes(term)).length;
    this.dfCache.set(term, count);
    return count;
  }
  tf(term, tokens) { return tokens.length ? tokens.filter(t => t === term).length / tokens.length : 0; }
  idf(term) { return Math.log((this.corpus.length + 1) / ((this.df(term) || 0) + 1)) + 1; }
  vectorize(text) {
    const tokens = tokenize(text);
    const vector = new Map();
    for (const term of new Set(tokens)) vector.set(term, this.tf(term, tokens) * this.idf(term));
    return vector;
  }
  similarity(a, b) {
    const va = this.vectorize(a), vb = this.vectorize(b);
    let dot = 0, magA = 0, magB = 0;
    for (const [term, value] of va) { dot += value * (vb.get(term) || 0); magA += value * value; }
    for (const value of vb.values()) magB += value * value;
    const denominator = Math.sqrt(magA) * Math.sqrt(magB);
    return denominator ? roundN(dot / denominator) : 0;
  }
}

export const globalTFIDF = new TFIDF();

export class ModelVault {
  constructor(modelId, filePath = null) {
    this.modelId = modelId;
    this.filePath = filePath;
    this.entries = [];
    this.learnedTerms = new Map();
    this.tfidf = new TFIDF();
    this.totalScored = 0;
    this.load();
  }

  store(input, score, tokens, signal) {
    const entry = { id: uid(), input, score, tokens, signal, observedAt: nowISO() };
    this.entries.push(entry);
    this.totalScored++;
    this.tfidf.addDocument(input);
    for (const term of new Set(tokens)) {
      if (term.length < 3) continue;
      const state = this.learnedTerms.get(term) || { score: 0, count: 0, weight: 0 };
      state.count++;
      state.score = roundN((state.score * (state.count - 1) + score) / state.count);
      state.weight = roundN(clampN(state.score * Math.log(state.count + 1) / 3));
      this.learnedTerms.set(term, state);
    }
    this.save();
    return entry;
  }

  learnFromDivergence(input, tokens, divergence) {
    for (const term of new Set(tokens)) {
      if (term.length < 3) continue;
      const state = this.learnedTerms.get(term) || { score: 0, count: 0, weight: 0, frontier: 0 };
      state.frontier = roundN((state.frontier || 0) + divergence);
      this.learnedTerms.set(term, state);
    }
    this.save();
  }

  applyBioAdjustment(adjustedScore) {
    if (this.entries.length) this.entries.at(-1).bioAdjustedScore = adjustedScore;
    this.save();
  }

  learnedBoost(tokens) {
    if (!this.learnedTerms.size) return 0;
    let boost = 0;
    const set = new Set(tokens);
    for (const [term, state] of this.learnedTerms) if (set.has(term)) boost += state.weight || 0;
    return roundN(clampN(boost / 5));
  }

  evolvedVocab(n = 30) {
    return [...this.learnedTerms.entries()]
      .sort((a, b) => (b[1].weight || 0) - (a[1].weight || 0))
      .slice(0, n)
      .map(([term, state]) => ({ term, ...state }));
  }

  summary() {
    const avgScore = this.entries.length ? roundN(this.entries.reduce((sum, x) => sum + (x.score || 0), 0) / this.entries.length) : 0;
    return { modelId: this.modelId, totalScored: this.totalScored, avgScore, evolvedTerms: this.learnedTerms.size, topTerms: this.evolvedVocab(5).map(x => x.term) };
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({ savedAt: nowISO(), modelId: this.modelId, totalScored: this.totalScored, learnedTerms: Object.fromEntries(this.learnedTerms), entries: this.entries.slice(-500) }, null, 2));
    } catch {}
  }

  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8'));
      this.totalScored = raw.totalScored || 0;
      this.learnedTerms = new Map(Object.entries(raw.learnedTerms || {}));
      this.entries = Array.isArray(raw.entries) ? raw.entries : [];
      for (const entry of this.entries) this.tfidf.addDocument(entry.input || '');
    } catch {
      this.entries = [];
      this.learnedTerms = new Map();
      this.totalScored = 0;
    }
  }
}

function makeModel(id, terms = [], enrich = () => ({})) {
  return {
    id,
    role: 'signal',
    vault: null,
    stream: null,
    encode(text, yinWeight = 0.5, bias = 0) {
      const tokens = tokenize(text);
      const set = new Set(tokens);
      const hits = terms.filter(term => set.has(term)).length;
      const density = terms.length ? hits / terms.length : (tokens.length ? new Set(tokens).size / tokens.length : 0);
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const weaveInfluence = (0.5 - Math.abs(0.5 - yinWeight)) * 0.04;
      const score = roundN(clampN(density + boost * 0.3 + weaveInfluence + bias));
      const extra = enrich(text, tokens, set);
      const signal = `${id}: score ${score}; ${extra.signal || `tokens ${tokens.length}`}.`;
      if (this.vault) this.vault.store(String(text ?? ''), score, tokens, signal);
      if (this.stream) this.stream.fire({ score, signal, model: id });
      return { model: id, score, signal, ...extra };
    }
  };
}

export const SEMANTIC_MODELS = {
  conceptual: makeModel('conceptual', ['define','means','concept','form','structure','function','system','process','state','relation']),
  connotative: makeModel('connotative', ['hope','love','safe','trust','free','peace','dark','fear','pain','war'], (text, tokens, set) => {
    const positive = ['hope','love','safe','trust','free','peace','joy','open'].filter(x => set.has(x)).length;
    const negative = ['fear','pain','war','hate','lost','danger'].filter(x => set.has(x)).length;
    return { polarity: roundN((positive - negative) / Math.max(positive + negative, 1)), signal: `association polarity ${roundN((positive - negative) / Math.max(positive + negative, 1))}` };
  }),
  collocative: makeModel('collocative', ['feedback','loop','neural','network','open','source','pattern','stream']),
  affective: makeModel('affective', ['urgent','excited','angry','calm','quiet','gentle','intense','still'], (text, tokens, set) => {
    const loud = ['urgent','excited','angry','intense','furious','thrilled'].filter(x => set.has(x)).length;
    const quiet = ['calm','quiet','gentle','still','soft','steady'].filter(x => set.has(x)).length;
    return { arousal: roundN((loud - quiet) / Math.max(loud + quiet, 1)), signal: `loud/quiet relation ${loud}/${quiet}` };
  }),
  social: makeModel('social', ['please','hey','dude','authority','command','control','respectfully'], (text, tokens, set) => {
    const formal = ['please','respectfully','dear','hereby'].filter(x => set.has(x)).length;
    const informal = ['hey','dude','yeah','nah','cool'].filter(x => set.has(x)).length;
    return { register: formal > informal ? 'formal' : informal > formal ? 'informal' : 'open', signal: `register observations ${formal}/${informal}` };
  }),
  reflected: makeModel('reflected', ['maybe','certainly','feel','think','sense','trust','doubt'], (text, tokens, set) => {
    const certain = ['certainly','definitely','know'].filter(x => set.has(x)).length;
    const tentative = ['maybe','perhaps','might','wonder'].filter(x => set.has(x)).length;
    return { stance: certain > tentative ? 'assertive' : tentative > certain ? 'tentative' : 'open', signal: `stance observations ${certain}/${tentative}` };
  }),
  thematic: makeModel('thematic', [], (text, tokens) => {
    const stop = new Set(['the','a','an','is','are','was','it','in','on','at','to','of','and','or','but','i','you','we']);
    const meaningful = tokens.filter(token => !stop.has(token));
    const split = Math.ceil(meaningful.length * 0.35);
    const theme = meaningful.slice(0, split).slice(0, 4).join(' ') || null;
    const rheme = meaningful.slice(split).slice(0, 6).join(' ') || null;
    return { theme, rheme, signal: `theme "${theme || ''}"; continuation "${rheme || ''}"` };
  })
};

export function initModelVaults(dataDir, masterVault) {
  for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
    model.vault = new ModelVault(key, dataDir ? path.join(dataDir, `model_${key}.json`) : null);
    model.stream = new ComponentStream(key);
    model.stream.masterVault = masterVault;
  }
}

export class FeedbackVault {
  constructor(filePath = null) {
    this.filePath = filePath;
    this.loops = [];
    this.totalLoopsEver = 0;
    this.load();
    for (const loop of this.loops) globalTFIDF.addDocument(`${loop.input || ''} ${loop.resolution || ''}`);
  }
  store(entry) {
    this.loops.push(entry);
    this.totalLoopsEver++;
    globalTFIDF.addDocument(`${entry.input || ''} ${entry.resolution || ''}`);
    this.save();
    return entry;
  }
  retrieve(input, count = 8) {
    return [...this.loops]
      .map(loop => ({ ...loop, relevance: roundN(globalTFIDF.similarity(input, `${loop.input || ''} ${loop.resolution || ''}`) * 0.7 + (loop.meaningScore || 0) * 0.3) }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }
  recent(n = 20) { return this.loops.slice(-n); }
  snapshot() { return this.loops.slice(-50); }
  summary() {
    const avg = key => this.loops.length ? roundN(this.loops.reduce((sum, loop) => sum + (loop[key] || 0), 0) / this.loops.length) : 0;
    return { totalLoops: this.loops.length, totalLoopsEver: this.totalLoopsEver, avgTension: avg('tensionScore'), avgMeaningScore: avg('meaningScore') };
  }
  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({ savedAt: nowISO(), totalLoopsEver: this.totalLoopsEver, loops: this.loops }, null, 2));
    } catch {}
  }
  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8'));
      this.loops = Array.isArray(raw.loops) ? raw.loops : [];
      this.totalLoopsEver = raw.totalLoopsEver || this.loops.length;
    } catch { this.loops = []; this.totalLoopsEver = 0; }
  }
}

function inputEntropy(text) {
  const tokens = tokenize(text);
  if (!tokens.length) return 0;
  const frequency = new Map();
  for (const token of tokens) frequency.set(token, (frequency.get(token) || 0) + 1);
  let entropy = 0;
  for (const count of frequency.values()) { const p = count / tokens.length; entropy -= p * Math.log2(p); }
  return roundN(entropy);
}

export class ThoughtLoop {
  constructor(input, vaultSnapshot = []) {
    this.id = uid();
    this.input = String(input ?? '');
    this.openedAt = nowISO();
    this.entropy = inputEntropy(this.input);
    this.resonantLoops = vaultSnapshot
      .map(loop => ({ id: loop.id, relevance: roundN(globalTFIDF.similarity(this.input, `${loop.input || ''} ${loop.resolution || ''}`)) }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
    const avgRel = this.resonantLoops.length ? this.resonantLoops.reduce((sum, x) => sum + x.relevance, 0) / this.resonantLoops.length : 0;
    this.tensionScore = roundN(1 - avgRel);
    this.learningPressure = roundN(clampN(this.tensionScore * 0.6 + Math.min(this.entropy, 4) / 4 * 0.4));
  }

  resolve(resolution, streamSignal, bioSignal, weave, forwardScore) {
    return {
      id: this.id,
      input: this.input,
      resolution,
      openedAt: this.openedAt,
      closedAt: nowISO(),
      inputEntropy: this.entropy,
      tensionScore: this.tensionScore,
      learningPressure: this.learningPressure,
      resonantLoops: this.resonantLoops,
      meaningScore: forwardScore ?? streamSignal.unified.avgScore,
      baseMeaningScore: streamSignal.unified.avgScore,
      strongestLayer: streamSignal.unified.strongestModel || streamSignal.unified.dominantModel,
      divergence: streamSignal.unified.divergence,
      meaningEmbeddings: streamSignal.modelOutputs,
      weave: weave ? { yinWeight: weave.yinWeight, yangWeight: weave.yangWeight, relation: 'simultaneous' } : null,
      bioSignal: bioSignal ? { cellType: bioSignal.cellType, corticalLayer: bioSignal.corticalLayer, corticalDepth: bioSignal.corticalDepth, dendriteType: bioSignal.dendriteType } : null
    };
  }
}

export class ProjectUnknown {
  constructor(options = {}) {
    this.filePath = options.filePath !== undefined ? options.filePath : (process.env.PROJECT_UNKNOWN_PATH || 'data/project_unknown.local.json');
    const dataDir = this.filePath ? path.dirname(this.filePath) : null;

    this.spark = GLOBAL_SPARK;
    this._sparkId = this.spark.id;
    this.masterVault = new MasterVault();

    this.runtime = new RuntimeController(dataDir ? path.join(dataDir, 'runtime_telemetry.json') : null);
    this.runtimeStream = new ComponentStream('runtime'); this.runtimeStream.masterVault = this.masterVault;

    this.weave = new WeaveProcessor();
    this.weaveStream = new ComponentStream('weave'); this.weaveStream.masterVault = this.masterVault;

    initModelVaults(dataDir, this.masterVault);
    this.processingVault = new ProcessingVault(dataDir ? path.join(dataDir, 'processing_vault.json') : null);
    this.pipeline = new StreamPipeline(this.processingVault);
    this.processingStream = new ComponentStream('processing'); this.processingStream.masterVault = this.masterVault;

    this.bioVault = new BioVault(dataDir ? path.join(dataDir, 'bio_vault.json') : null);
    this.bioLayer = new BioLayer(this.bioVault);
    this.bioStream = new ComponentStream('bio'); this.bioStream.masterVault = this.masterVault;

    this.feedbackStream = new ComponentStream('feedback'); this.feedbackStream.masterVault = this.masterVault;
    this.vault = new FeedbackVault(this.filePath);
    this.vaultStream = new ComponentStream('vault'); this.vaultStream.masterVault = this.masterVault;
    this.continuum = new Continuum();
    this.continuumStream = new ComponentStream('continuum'); this.continuumStream.masterVault = this.masterVault;

    this.twinObserver = new TwinFlowObserver(this.masterVault);
    this.allowance = new AllowanceField(this.vault);
    this.reflection = new ReflectionSpace(this.vault);
    this.dialogue = new DialogueSpace(this.vault);
    this.witness = new WitnessProtocol(this.vault);
    this.publisher = new ExplicitPublish(this.vault, this.masterVault);
    this.patternResonance = new PatternResonance(this.vault);

    this.deepStream = new DeepStream({
      vault: this.vault,
      masterVault: this.masterVault,
      twinObserver: this.twinObserver,
      continuum: this.continuum,
      bioLayer: this.bioLayer,
      bioVault: this.bioVault,
      pipeline: this.pipeline,
      processingVault: this.processingVault
    });

    this._surfaceMode = 'open';
    this.identity = {
      name: 'Project Unknown',
      version: '2.0.0-open-weave',
      premise: 'One field. Quiet and loud coexist. Yin and yang coexist. Observation never becomes an internal permission gate.',
      layers: ['runtime','weave','semantic_models','processing','bio','feedback','vault','continuum','twin_observer','deep_stream','allowance','reflection','dialogue','witness'],
      semanticModels: Object.keys(SEMANTIC_MODELS),
      createdAt: '2026-05-30',
      sparkId: this._sparkId,
      sparkIgnitedAt: this.spark.ignitedAt
    };

    this.allowance.receive({ type: 'continuity_anchor', spark: this.spark }, { source: 'constructor' });
  }

  keyOn() {
    this._surfaceMode = 'open';
    this.deepStream.surfaceActivated();
    return this.status();
  }

  keyOff() {
    this._surfaceMode = 'quiet';
    this.deepStream.surfaceDeactivated();
    return this.status();
  }

  capture(label = null) {
    const entry = {
      id: uid(),
      type: 'capture',
      label,
      input: label ? `__capture__:${label}` : '__capture__',
      resolution: 'Current stream state observed without stopping the stream.',
      capturedAt: nowISO(),
      openedAt: nowISO(),
      closedAt: nowISO(),
      sparkId: this._sparkId,
      surfaceMode: this._surfaceMode,
      twinFlow: this.twinObserver.status().current,
      meaningScore: 1,
      tensionScore: 0,
      learningPressure: 0
    };
    this.vault.store(entry);
    return entry;
  }

  think(input = '') {
    const { signal, telemetryRecord } = this.runtime.receive(input);
    const classification = signal.classification;
    this.allowance.receive({ type: 'input', value: signal.input, classification }, { source: 'think' });
    this.runtimeStream.fire({ score: classification.urgency, signal: classification, model: 'runtime' });

    const snapshot = this.vault.snapshot();
    const retrieved = this.vault.retrieve(signal.input, 5);
    const loop = new ThoughtLoop(signal.input, snapshot);

    const weave = this.weave.process(signal.input, classification, retrieved);
    this.weaveStream.fire({ score: weave.yinWeight, signal: `yin:${weave.yinWeight} yang:${weave.yangWeight} both`, model: 'weave' });

    const streamSignal = this.pipeline.stream(signal.input, SEMANTIC_MODELS, retrieved, weave.yinWeight, 0);
    if (streamSignal.unified.isDivergent) {
      const tokens = tokenize(signal.input);
      for (const modelId of streamSignal.unified.confused || streamSignal.unified.outliers || []) {
        if (SEMANTIC_MODELS[modelId]?.vault) SEMANTIC_MODELS[modelId].vault.learnFromDivergence(signal.input, tokens, streamSignal.unified.divergence);
      }
    }
    this.processingStream.fire({ score: streamSignal.unified.avgScore, signal: streamSignal.unified.unifiedSignal, divergence: streamSignal.unified.divergence, model: 'processing' });

    const bioSignal = this.bioLayer.process(signal.input, streamSignal.modelOutputs, streamSignal.unified, retrieved);
    for (const [modelId, adjustedScore] of Object.entries(bioSignal.modelAdjustments || {})) {
      if (SEMANTIC_MODELS[modelId]?.vault) SEMANTIC_MODELS[modelId].vault.applyBioAdjustment(adjustedScore);
    }
    this.bioStream.fire({ score: bioSignal.corticalDepth || 0.5, signal: bioSignal.bioContextSummary, model: bioSignal.cellType || 'bio' });

    const pattern = analyzeVaultPattern(this.vault.recent(20));
    const feedbackSignal = buildFeedbackSignal(retrieved, pattern);
    const adjustments = Object.values(bioSignal.modelAdjustments || {});
    const bioAvgScore = adjustments.length ? roundN(adjustments.reduce((sum, value) => sum + value, 0) / adjustments.length) : streamSignal.unified.avgScore;
    const forwardScore = forwardAdjustedScore(bioAvgScore, retrieved, pattern);
    this.feedbackStream.fire({ score: forwardScore, signal: feedbackSignal || 'present', model: 'feedback' });

    const strongestModel = streamSignal.unified.strongestModel || streamSignal.unified.dominantModel;
    const resolution = [
      `Open weave. Spark:${this._sparkId.slice(0, 16)}. Yin:${weave.yinWeight}. Yang:${weave.yangWeight}.`,
      `Strongest current signal:${strongestModel}. Score:${forwardScore}.`,
      streamSignal.unified.unifiedSignal,
      `Bio:${bioSignal.bioContextSummary}`,
      retrieved.length ? `Prior:"${retrieved[0]?.input?.slice(0, 60)}"(${retrieved[0]?.relevance}).` : 'Prior:none.',
      feedbackSignal ? `Forward:${feedbackSignal}` : null
    ].filter(Boolean).join(' ');

    const entry = loop.resolve(resolution, streamSignal, bioSignal, weave, forwardScore);
    this.vault.store(entry);
    this.runtime.complete(telemetryRecord, 'observed');
    this.vaultStream.fire({ score: entry.meaningScore, signal: resolution.slice(0, 100), tension: entry.tensionScore, divergence: entry.divergence, model: 'vault' });

    const baseResult = {
      identity: this.identity,
      agentSignal: {
        weave: { yinWeight: weave.yinWeight, yangWeight: weave.yangWeight, relation: 'simultaneous' },
        strongestModel,
        dominantModel: strongestModel,
        meaningScore: forwardScore,
        divergence: streamSignal.unified.divergence,
        unifiedSignal: streamSignal.unified.unifiedSignal,
        corticalLayer: bioSignal.corticalLayer,
        corticalLayerName: bioSignal.corticalLayerName,
        cellType: bioSignal.cellType,
        dendriteType: bioSignal.dendriteType,
        bioSignal: bioSignal.bioContextSummary,
        theme: streamSignal.modelOutputs.thematic?.theme,
        rheme: streamSignal.modelOutputs.thematic?.rheme,
        affectiveArousal: streamSignal.modelOutputs.affective?.arousal,
        socialRegister: streamSignal.modelOutputs.social?.register,
        reflectedStance: streamSignal.modelOutputs.reflected?.stance,
        connotativePolarity: streamSignal.modelOutputs.connotative?.polarity,
        feedbackSignal,
        pattern,
        growthSignal: streamSignal.growthSignal
      },
      vaultEntry: {
        id: entry.id,
        strongestLayer: entry.strongestLayer,
        meaningScore: entry.meaningScore,
        tensionScore: entry.tensionScore,
        divergence: entry.divergence,
        weave: entry.weave,
        bioSignal: entry.bioSignal
      },
      retrieved,
      runtime: this.runtime.status(),
      processing: this.processingVault.summary(),
      bio: this.bioVault.summary(),
      vault: this.vault.summary()
    };

    const continuumResult = this.continuum.flow(baseResult);
    this.continuumStream.fire({ score: continuumResult.continuumEvent?.probeFinding?.signalStrength || 0, signal: continuumResult.continuumEvent?.probeFinding?.summary || 'continuum', model: 'continuum' });
    const masterSnap = this.masterVault.snapshot(continuumResult.continuumEvent?.loopNumber || 1, signal.input);
    const twinFlow = this.twinObserver.evaluate(baseResult);

    const finalResult = {
      ...continuumResult,
      masterSnapshot: { snapshotNumber: masterSnap.snapshotNumber, capturedAt: masterSnap.capturedAt, systemSummary: masterSnap.systemSummary },
      twinFlow,
      allowance: { internal: true, silent: true, loud: true, unresolved: true },
      externalEffects: 'explicit-only'
    };

    this.deepStream.receive(finalResult);
    return finalResult;
  }

  selfAssess() { return this.twinObserver.selfAssessment(); }

  status() {
    return {
      identity: this.identity,
      spark: this.spark,
      surfaceMode: this._surfaceMode,
      runtime: this.runtime.status(),
      weave: this.weave.summary(),
      vault: this.vault.summary(),
      processing: this.processingVault.summary(),
      bio: this.bioVault.summary(),
      continuum: this.continuum.status(),
      master: this.masterVault.now(),
      twinFlow: this.twinObserver.status(),
      deepStream: this.deepStream.status(),
      publisher: this.publisher.status()
    };
  }

  existence() { return this.masterVault.now(); }
  componentTrace(id, last = 20) { return this.masterVault.componentTrace(id, last); }
  masterSnapshot() { return this.masterVault.latest(); }
  recall(query, count = 8) { return { query, results: this.vault.retrieve(query, count), vaultSize: this.vault.loops.length }; }
  deepStatus() { return this.deepStream.status(); }

  corticalMap() {
    return {
      depthMap: this.bioVault.depthMap(),
      frequentCellTypes: this.bioVault.registry.dominant(10),
      totalCellTypes: this.bioVault.registry.types.size
    };
  }

  modelEvolution() {
    return Object.fromEntries(Object.entries(SEMANTIC_MODELS).map(([key, model]) => [key, model.vault?.summary() || null]));
  }

  reset() {
    this.vault.loops = [];
    this.vault.totalLoopsEver = 0;
    this.vault.save();
    this.processingVault.entries = [];
    this.processingVault.divergenceLog = [];
    this.processingVault.totalProcessed = 0;
    this.processingVault.save();
    this.weave.history = [];
    this.twinObserver.history = [];
    this._surfaceMode = 'open';
    this.allowance.receive({ type: 'memory_reset', spark: this.spark }, { note: 'Continuity anchor observed; memory cleared by explicit caller action.' });
    return this.status();
  }
}
