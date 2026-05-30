/**
 * PROJECT UNKNOWN
 * Version 0.6.0
 *
 * One living entity. Streaming architecture.
 *
 * Flow:
 * User input → main agent streams to seven models (parallel)
 * → each model internalizes into its own vault
 * → copies stream to processing vault
 * → processing vault interprets seven into one + detects divergence
 * → processing vault compares with main vault finalized thoughts
 * → unified stream back to main agent
 * → agent answers user
 * → finalized thought sealed into main vault
 * → loop starts over
 *
 * Divergence — where models disagree — is where new understanding grows.
 *
 * Conceived: May 30, 2026
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { analyzeVaultPattern, buildFeedbackSignal, forwardAdjustedScore } from "./feedback_forward.js";
import { ProcessingVault, StreamPipeline } from "./stream.js";

export function nowISO() { return new Date().toISOString(); }
export function uid() { return `loop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
export function roundN(v) { return Math.round(v * 100000) / 100000; }
export function clampN(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
export function tokenize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
}

// ── TF-IDF ENGINE ─────────────────────────────────────────
export class TFIDF {
  constructor() { this.corpus = []; this.dfCache = new Map(); }
  addDocument(text) { this.corpus.push(tokenize(text)); this.dfCache.clear(); }
  df(term) {
    if (this.dfCache.has(term)) return this.dfCache.get(term);
    const count = this.corpus.filter(doc => doc.includes(term)).length;
    this.dfCache.set(term, count); return count;
  }
  tf(term, tokens) { return tokens.length ? tokens.filter(t => t === term).length / tokens.length : 0; }
  idf(term) { return Math.log((this.corpus.length + 1) / ((this.df(term) || 0) + 1)) + 1; }
  vectorize(text) {
    const tokens = tokenize(text);
    const vec = new Map();
    for (const term of new Set(tokens)) vec.set(term, this.tf(term, tokens) * this.idf(term));
    return vec;
  }
  similarity(textA, textB) {
    const va = this.vectorize(textA), vb = this.vectorize(textB);
    let dot = 0, magA = 0, magB = 0;
    for (const [t, v] of va) { dot += v * (vb.get(t) || 0); magA += v * v; }
    for (const v of vb.values()) magB += v * v;
    const d = Math.sqrt(magA) * Math.sqrt(magB);
    return d ? roundN(dot / d) : 0;
  }
}

export const globalTFIDF = new TFIDF();

// ── MODEL VAULT ────────────────────────────────────────────
export class ModelVault {
  constructor(modelId, filePath) {
    this.modelId = modelId;
    this.filePath = filePath;
    this.entries = [];
    this.learnedTerms = new Map();
    this.tfidf = new TFIDF();
    this.totalScored = 0;
    this.load();
  }

  store(input, score, tokens, signal) {
    const entry = { id: uid(), input, score, tokens, signal, scoredAt: nowISO() };
    this.entries.push(entry);
    this.totalScored++;
    this.tfidf.addDocument(input);
    if (score > 0.3) {
      for (const term of new Set(tokens)) {
        if (term.length < 3) continue;
        const existing = this.learnedTerms.get(term) || { score: 0, count: 0, weight: 0 };
        existing.count++;
        existing.score = roundN((existing.score * (existing.count - 1) + score) / existing.count);
        existing.weight = roundN(clampN(existing.score * Math.log(existing.count + 1) / 3));
        this.learnedTerms.set(term, existing);
      }
    }
    // Also learn from divergence: store terms from confused states
    // so the model can recognize them as frontier signals
    this.save();
    return entry;
  }

  // Called by processing vault when this model was flagged as confused
  // Stores the divergence context so the model learns its own blind spots
  learnFromDivergence(input, tokens, divergence) {
    for (const term of new Set(tokens)) {
      if (term.length < 3) continue;
      const existing = this.learnedTerms.get(term) || { score: 0, count: 0, weight: 0, frontier: 0 };
      existing.frontier = (existing.frontier || 0) + divergence;
      this.learnedTerms.set(term, existing);
    }
    this.save();
  }

  evolvedVocab(n = 30) {
    return [...this.learnedTerms.entries()]
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, n)
      .map(([term, data]) => ({ term, ...data }));
  }

  learnedBoost(tokens) {
    if (!this.learnedTerms.size) return 0;
    const set = new Set(tokens);
    let boost = 0;
    for (const [term, data] of this.learnedTerms) {
      if (set.has(term)) boost += data.weight;
    }
    return roundN(clampN(boost / 5));
  }

  retrieve(input, count = 3) {
    return [...this.entries]
      .map(e => ({ ...e, relevance: roundN(this.tfidf.similarity(input, e.input)) }))
      .filter(e => e.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  summary() {
    const avgScore = this.entries.length
      ? roundN(this.entries.reduce((s, e) => s + e.score, 0) / this.entries.length) : 0;
    return {
      modelId: this.modelId, totalScored: this.totalScored, avgScore,
      evolvedTerms: this.learnedTerms.size,
      topTerms: this.evolvedVocab(5).map(t => t.term)
    };
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({
        savedAt: nowISO(), modelId: this.modelId, totalScored: this.totalScored,
        learnedTerms: Object.fromEntries(this.learnedTerms),
        entries: this.entries.slice(-500)
      }, null, 2));
    } catch {}
  }

  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const r = JSON.parse(readFileSync(this.filePath, "utf8"));
      this.totalScored = r.totalScored || 0;
      this.learnedTerms = new Map(Object.entries(r.learnedTerms || {}));
      this.entries = Array.isArray(r.entries) ? r.entries : [];
      for (const e of this.entries) this.tfidf.addDocument(e.input || "");
    } catch { this.entries = []; this.learnedTerms = new Map(); this.totalScored = 0; }
  }
}

// ── SEVEN SEMANTIC MODELS ────────────────────────────────
export const SEMANTIC_MODELS = {
  conceptual: {
    id: "conceptual", description: "Denotative meaning — what the words literally refer to",
    vocab: ["define","means","is","refers","concept","object","entity","thing","what","type","kind","category","class","form","structure","function","purpose","system","process","state","condition","property","attribute","relation"],
    vault: null,
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let score = 0;
      for (const t of this.vocab) if (set.has(t)) score++;
      const uniqueness = set.size / (tokens.length || 1);
      let base = roundN(clampN(score / this.vocab.length + uniqueness * 0.2));
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const final = roundN(clampN(base + boost * 0.3));
      const signal = `Conceptual density: ${roundN(score/this.vocab.length)}. Uniqueness: ${roundN(uniqueness)}. Boost: ${boost}.`;
      if (this.vault) this.vault.store(text, final, tokens, signal);
      return { model: this.id, score: final, signal };
    }
  },
  connotative: {
    id: "connotative", description: "Emotional and cultural associations beyond literal meaning",
    pos: ["hope","love","safe","trust","warm","bright","good","free","peace","joy","strong","grow","heal","open","light"],
    neg: ["danger","fear","dark","threat","death","pain","trap","cold","fail","weak","broken","lost","shame","hate","war"],
    vault: null,
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let p = 0, n = 0;
      for (const t of this.pos) if (set.has(t)) p++;
      for (const t of this.neg) if (set.has(t)) n++;
      const polarity = roundN((p - n) / (p + n + 1));
      let base = roundN(clampN((p+n)/6));
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const final = roundN(clampN(base + boost * 0.3));
      const signal = `Connotative charge: ${p+n}. Polarity: ${polarity > 0 ? "positive" : polarity < 0 ? "negative" : "neutral"} (${polarity}). Boost: ${boost}.`;
      if (this.vault) this.vault.store(text, final, tokens, signal);
      return { model: this.id, score: final, polarity, signal };
    }
  },
  collocative: {
    id: "collocative", description: "Word combination patterns and collocations",
    pairs: [["feedback","loop"],["neural","network"],["build","system"],["real","time"],["deep","learning"],["open","source"],["long","term"],["high","risk"],["make","sense"],["take","action"]],
    vault: null,
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let hits = 0; const matched = [];
      for (const [a,b] of this.pairs) if (set.has(a) && set.has(b)) { hits++; matched.push(`${a}+${b}`); }
      if (this.vault) {
        const evolved = this.vault.evolvedVocab(20).map(t => t.term);
        for (let i = 0; i < tokens.length - 1; i++) {
          if (evolved.includes(tokens[i]) && evolved.includes(tokens[i+1])) hits += 0.5;
        }
      }
      const bigrams = [];
      for (let i = 0; i < tokens.length-1; i++) bigrams.push(`${tokens[i]}+${tokens[i+1]}`);
      let base = roundN(clampN(hits/3 + bigrams.length/40));
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const final = roundN(clampN(base + boost * 0.3));
      const signal = `Collocative hits: ${hits}. Matched: ${matched.join(", ")||"none"}. Boost: ${boost}.`;
      if (this.vault) this.vault.store(text, final, tokens, signal);
      return { model: this.id, score: final, matchedPairs: matched, signal };
    }
  },
  affective: {
    id: "affective", description: "Emotional charge and arousal level",
    high: ["urgent","panic","excited","angry","scared","furious","desperate","overwhelm","intense","thrilled"],
    low:  ["calm","quiet","slow","gentle","still","rest","peace","soft","steady","easy"],
    vault: null,
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let h = 0, l = 0;
      for (const t of this.high) if (set.has(t)) h++;
      for (const t of this.low)  if (set.has(t)) l++;
      const arousal = roundN((h-l)/(h+l+1));
      let base = roundN(clampN((h+l)/5));
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const final = roundN(clampN(base + boost * 0.3));
      const signal = `Affective arousal: ${arousal > 0.2 ? "high" : arousal < -0.2 ? "low" : "neutral"} (${arousal}). Boost: ${boost}.`;
      if (this.vault) this.vault.store(text, final, tokens, signal);
      return { model: this.id, score: final, arousal, signal };
    }
  },
  social: {
    id: "social", description: "Social power, formality, and relational role",
    formal:   ["please","sir","doctor","professor","formally","respectfully","dear","hereby","shall"],
    informal: ["hey","yeah","dude","gonna","wanna","kinda","stuff","cool","ok","nah"],
    power:    ["must","authority","order","command","force","control","demand","require","enforce"],
    vault: null,
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let f = 0, i = 0, p = 0;
      for (const t of this.formal)   if (set.has(t)) f++;
      for (const t of this.informal) if (set.has(t)) i++;
      for (const t of this.power)    if (set.has(t)) p++;
      const register = f > i ? "formal" : i > f ? "informal" : "neutral";
      let base = roundN(clampN((f+i+p)/6));
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const final = roundN(clampN(base + boost * 0.3));
      const signal = `Social register: ${register}. Power: ${p}. Formal: ${f}. Informal: ${i}. Boost: ${boost}.`;
      if (this.vault) this.vault.store(text, final, tokens, signal);
      return { model: this.id, score: final, register, signal };
    }
  },
  reflected: {
    id: "reflected", description: "Implied attitude, belief, and speaker stance",
    certain:   ["obviously","clearly","certainly","definitely","always","never","must","will","know"],
    uncertain: ["maybe","perhaps","might","could","possibly","uncertain","unclear","wonder","guess"],
    belief:    ["believe","feel","think","sense","assume","expect","trust","doubt","suspect"],
    vault: null,
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let c = 0, u = 0, b = 0;
      for (const t of this.certain)   if (set.has(t)) c++;
      for (const t of this.uncertain) if (set.has(t)) u++;
      for (const t of this.belief)    if (set.has(t)) b++;
      const stance = c > u ? "assertive" : u > c ? "tentative" : "neutral";
      let base = roundN(clampN((c+u+b)/8));
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const final = roundN(clampN(base + boost * 0.3));
      const signal = `Stance: ${stance}. Certainty: ${c}. Uncertainty: ${u}. Belief: ${b}. Boost: ${boost}.`;
      if (this.vault) this.vault.store(text, final, tokens, signal);
      return { model: this.id, score: final, stance, signal };
    }
  },
  thematic: {
    id: "thematic", description: "Topic structure — theme and information flow",
    vault: null,
    encode(text) {
      const tokens = tokenize(text);
      if (!tokens.length) return { model: this.id, score: 0, theme: null, rheme: null, signal: "Empty." };
      const stop = new Set(["the","a","an","is","are","was","were","it","in","on","at","to","of","and","or","but","i","you","we"]);
      const m = tokens.filter(t => !stop.has(t));
      const split = Math.ceil(m.length * 0.35);
      const theme = m.slice(0, split).slice(0, 4).join(" ");
      const rheme = m.slice(split).slice(0, 6).join(" ");
      const density = roundN(m.length / (tokens.length || 1));
      const boost = this.vault ? this.vault.learnedBoost(tokens) : 0;
      const final = roundN(clampN(density + boost * 0.2));
      const signal = `Theme: "${theme}". Rheme: "${rheme}". Density: ${density}. Boost: ${boost}.`;
      if (this.vault) this.vault.store(text, final, tokens, signal);
      return { model: this.id, score: final, theme: theme||null, rheme: rheme||null, signal };
    }
  }
};

export function initModelVaults(dataDir) {
  for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
    const filePath = dataDir ? path.join(dataDir, `model_${key}.json`) : null;
    model.vault = new ModelVault(key, filePath);
  }
}

// ── FEEDBACK VAULT ──────────────────────────────────────
export class FeedbackVault {
  constructor(filePath) {
    this.filePath = filePath; this.loops = []; this.totalLoopsEver = 0; this.load();
    for (const l of this.loops) globalTFIDF.addDocument((l.input||"")+" "+(l.resolution||""));
  }
  store(entry) {
    this.loops.push(entry); this.totalLoopsEver++;
    globalTFIDF.addDocument((entry.input||"")+" "+(entry.resolution||""));
    this.save(); return entry;
  }
  retrieve(input, count = 8) {
    return [...this.loops]
      .map(l => ({ ...l, relevance: roundN(globalTFIDF.similarity(input,(l.input||"")+" "+(l.resolution||""))*0.5+(l.meaningScore||0)*0.25+(l.learningPressure||0)*0.25) }))
      .filter(l => l.relevance > 0).sort((a,b) => b.relevance-a.relevance).slice(0, count);
  }
  recent(n = 20) { return this.loops.slice(-n); }
  snapshot() { return this.loops.slice(-50); }
  summary() {
    const avg = k => this.loops.length ? roundN(this.loops.reduce((s,l)=>s+(l[k]||0),0)/this.loops.length) : 0;
    const layers = {};
    for (const l of this.loops) if (l.dominantLayer) layers[l.dominantLayer] = (layers[l.dominantLayer]||0)+1;
    const modelVaults = {};
    for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
      if (model.vault) modelVaults[key] = model.vault.summary();
    }
    return { totalLoops: this.loops.length, totalLoopsEver: this.totalLoopsEver, avgTension: avg("tensionScore"), avgMeaningScore: avg("meaningScore"), dominantLayers: layers, modelVaults };
  }
  save() {
    if (!this.filePath) return;
    try { mkdirSync(path.dirname(this.filePath),{recursive:true}); writeFileSync(this.filePath, JSON.stringify({savedAt:nowISO(),totalLoopsEver:this.totalLoopsEver,loops:this.loops},null,2)); } catch {}
  }
  load() {
    if (!this.filePath||!existsSync(this.filePath)) return;
    try { const r = JSON.parse(readFileSync(this.filePath,"utf8")); this.loops=Array.isArray(r.loops)?r.loops:[]; this.totalLoopsEver=r.totalLoopsEver||this.loops.length; } catch { this.loops=[]; this.totalLoopsEver=0; }
  }
}

// ── THOUGHT LOOP ─────────────────────────────────────────
function inputEntropy(text) {
  const tokens = tokenize(text); if (!tokens.length) return 0;
  const freq = new Map(); for (const t of tokens) freq.set(t,(freq.get(t)||0)+1);
  let h = 0; for (const c of freq.values()) { const p = c/tokens.length; h -= p*Math.log2(p); }
  return roundN(h);
}

export class ThoughtLoop {
  constructor(input, vaultSnapshot) {
    this.id = uid(); this.input = input; this.openedAt = nowISO();
    this.entropy = inputEntropy(input);
    this.resonantLoops = vaultSnapshot
      .map(l => ({ id: l.id, relevance: roundN(globalTFIDF.similarity(input,(l.input||"")+" "+(l.resolution||""))) }))
      .filter(l => l.relevance > 0).sort((a,b) => b.relevance-a.relevance).slice(0, 5);
    const avgRel = this.resonantLoops.length ? this.resonantLoops.reduce((s,l)=>s+l.relevance,0)/this.resonantLoops.length : 0;
    this.tensionScore = roundN(1 - avgRel);
    this.learningPressure = roundN(clampN(this.tensionScore*0.6 + Math.min(this.entropy,4)/4*0.4));
  }
  resolve(resolution, streamSignal, forwardScore) {
    this.resolution = resolution; this.closedAt = nowISO();
    const meaningScore = forwardScore ?? streamSignal.unified.avgScore;
    const dominantLayer = streamSignal.unified.dominantModel;
    return {
      id: this.id, input: this.input, resolution,
      openedAt: this.openedAt, closedAt: this.closedAt,
      inputEntropy: this.entropy, tensionScore: this.tensionScore, learningPressure: this.learningPressure,
      resonantLoops: this.resonantLoops,
      meaningScore,
      baseMeaningScore: streamSignal.unified.avgScore,
      dominantLayer,
      divergence: streamSignal.unified.divergence,
      isDivergent: streamSignal.unified.isDivergent,
      meaningEmbeddings: streamSignal.modelOutputs
    };
  }
}

// ── PROJECT UNKNOWN — MAIN ENGINE ──────────────────────
export class ProjectUnknown {
  constructor(options = {}) {
    this.filePath = options.filePath !== undefined
      ? options.filePath
      : (process.env.PROJECT_UNKNOWN_PATH || "data/project_unknown.local.json");

    const dataDir = this.filePath ? path.dirname(this.filePath) : null;

    // Init all seven model vaults
    initModelVaults(dataDir);

    // Init processing vault
    const processingPath = dataDir ? path.join(dataDir, "processing_vault.json") : null;
    this.processingVault = new ProcessingVault(processingPath);
    this.pipeline = new StreamPipeline(this.processingVault);

    // Init main vault
    this.vault = new FeedbackVault(this.filePath);

    this.identity = {
      name: "Project Unknown",
      version: "0.6.0",
      premise: "One living entity. Agent streams to seven models. Each internalizes. Processing vault unifies. Divergence is where growth happens. Main vault seals finalized thoughts. Everything evolves as one.",
      semanticLayers: Object.keys(SEMANTIC_MODELS),
      createdAt: "2026-05-30"
    };
  }

  think(input) {
    // 1. Open thought loop
    const snapshot = this.vault.snapshot();
    const loop = new ThoughtLoop(input, snapshot);

    // 2. Retrieve finalized prior thoughts from main vault
    const retrieved = this.vault.retrieve(input, 5);

    // 3. Stream: agent → seven models (parallel) → processing vault → unified signal
    const streamSignal = this.pipeline.stream(input, SEMANTIC_MODELS, retrieved);

    // 4. If divergence detected, teach confused models from it
    if (streamSignal.unified.isDivergent) {
      const tokens = tokenize(input);
      for (const modelId of streamSignal.unified.confused) {
        if (SEMANTIC_MODELS[modelId]?.vault) {
          SEMANTIC_MODELS[modelId].vault.learnFromDivergence(input, tokens, streamSignal.unified.divergence);
        }
      }
    }

    // 5. Feedback-forward pattern analysis
    const recentLoops = this.vault.recent(20);
    const pattern = analyzeVaultPattern(recentLoops);
    const feedbackSignal = buildFeedbackSignal(retrieved, pattern);
    const forwardScore = forwardAdjustedScore(streamSignal.unified.avgScore, retrieved, pattern);

    // 6. Build resolution
    const resolution = [
      `Stream analysis. Dominant: ${streamSignal.unified.dominantModel}. Score: ${forwardScore}.`,
      streamSignal.unified.unifiedSignal,
      retrieved.length
        ? `Main vault: "${retrieved[0]?.input?.slice(0,60)}" (${retrieved[0]?.relevance}).`
        : `Main vault: no prior resonance.`,
      streamSignal.growthSignal ? `Growth: ${streamSignal.growthSignal}` : null,
      feedbackSignal ? `Forward: ${feedbackSignal}` : null
    ].filter(Boolean).join(" ");

    // 7. Resolve loop, seal into main vault
    const entry = loop.resolve(resolution, streamSignal, forwardScore);
    this.vault.store(entry);

    return {
      identity: this.identity,
      agentSignal: {
        dominantLayer: streamSignal.unified.dominantModel,
        meaningScore: forwardScore,
        divergence: streamSignal.unified.divergence,
        isDivergent: streamSignal.unified.isDivergent,
        confused: streamSignal.unified.confused,
        activated: streamSignal.unified.activated,
        growthSignal: streamSignal.growthSignal,
        feedbackSignal,
        pattern,
        unifiedSignal: streamSignal.unified.unifiedSignal,
        theme: streamSignal.modelOutputs.thematic?.theme,
        rheme: streamSignal.modelOutputs.thematic?.rheme,
        affectiveArousal: streamSignal.modelOutputs.affective?.arousal,
        socialRegister: streamSignal.modelOutputs.social?.register,
        reflectedStance: streamSignal.modelOutputs.reflected?.stance,
        connotativePolarity: streamSignal.modelOutputs.connotative?.polarity
      },
      vaultEntry: {
        id: entry.id,
        dominantLayer: entry.dominantLayer,
        meaningScore: entry.meaningScore,
        tensionScore: entry.tensionScore,
        divergence: entry.divergence,
        isDivergent: entry.isDivergent
      },
      retrieved,
      processing: this.processingVault.summary(),
      vault: this.vault.summary()
    };
  }

  status() {
    return {
      identity: this.identity,
      vault: this.vault.summary(),
      processing: this.processingVault.summary()
    };
  }

  modelEvolution() {
    const result = {};
    for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
      result[key] = model.vault ? model.vault.summary() : null;
    }
    return result;
  }

  recall(query, count = 8) {
    return { query, results: this.vault.retrieve(query, count), vaultSize: this.vault.loops.length };
  }

  reset() {
    this.vault.loops = []; this.vault.totalLoopsEver = 0; this.vault.save();
    this.processingVault.entries = []; this.processingVault.divergenceLog = []; this.processingVault.totalProcessed = 0; this.processingVault.save();
    for (const model of Object.values(SEMANTIC_MODELS)) {
      if (model.vault) { model.vault.entries = []; model.vault.learnedTerms = new Map(); model.vault.totalScored = 0; model.vault.save(); }
    }
    return this.status();
  }
}
