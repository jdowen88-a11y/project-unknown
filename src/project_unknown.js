/**
 * PROJECT UNKNOWN
 * Version 0.3.0
 *
 * The premise:
 * Instead of one permanent feedback loop,
 * every thought creates its own feedback loop.
 * Each loop processes through seven semantic models.
 * Each loop resolves and stores itself permanently in the vault.
 * The vault is the intelligence. It grows forever.
 *
 * The seven semantic models are independent working units.
 * Each processes a distinct layer of meaning.
 * Together they give every thought a seven-layer meaning vector.
 *
 * Conceived: May 30, 2026
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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

// ── SEVEN SEMANTIC MODELS ────────────────────────────────
export const SEMANTIC_MODELS = {
  conceptual: {
    id: "conceptual", description: "Denotative meaning — what the words literally refer to",
    vocab: ["define","means","is","refers","concept","object","entity","thing","what","type","kind","category","class","form","structure","function","purpose","system","process","state","condition","property","attribute","relation"],
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let score = 0;
      for (const t of this.vocab) if (set.has(t)) score++;
      const uniqueness = set.size / (tokens.length || 1);
      return { model: this.id, score: roundN(clampN(score / this.vocab.length + uniqueness * 0.2)), signal: `Conceptual density: ${roundN(score/this.vocab.length)}. Uniqueness: ${roundN(uniqueness)}.` };
    }
  },
  connotative: {
    id: "connotative", description: "Emotional and cultural associations beyond literal meaning",
    pos: ["hope","love","safe","trust","warm","bright","good","free","peace","joy","strong","grow","heal","open","light"],
    neg: ["danger","fear","dark","threat","death","pain","trap","cold","fail","weak","broken","lost","shame","hate","war"],
    encode(text) {
      const set = new Set(tokenize(text)); let p = 0, n = 0;
      for (const t of this.pos) if (set.has(t)) p++;
      for (const t of this.neg) if (set.has(t)) n++;
      const polarity = roundN((p - n) / (p + n + 1));
      return { model: this.id, score: roundN(clampN((p+n)/6)), polarity, signal: `Connotative charge: ${p+n}. Polarity: ${polarity > 0 ? "positive" : polarity < 0 ? "negative" : "neutral"} (${polarity}).` };
    }
  },
  collocative: {
    id: "collocative", description: "Word combination patterns and collocations",
    pairs: [["feedback","loop"],["neural","network"],["build","system"],["real","time"],["deep","learning"],["open","source"],["long","term"],["high","risk"],["make","sense"],["take","action"]],
    encode(text) {
      const tokens = tokenize(text); const set = new Set(tokens); let hits = 0; const matched = [];
      for (const [a,b] of this.pairs) if (set.has(a) && set.has(b)) { hits++; matched.push(`${a}+${b}`); }
      const bigrams = [];
      for (let i = 0; i < tokens.length-1; i++) bigrams.push(`${tokens[i]}+${tokens[i+1]}`);
      return { model: this.id, score: roundN(clampN(hits/3 + bigrams.length/40)), matchedPairs: matched, signal: `Collocative hits: ${hits}. Matched: ${matched.join(", ")||"none"}.` };
    }
  },
  affective: {
    id: "affective", description: "Emotional charge and arousal level",
    high: ["urgent","panic","excited","angry","scared","furious","desperate","overwhelm","intense","thrilled"],
    low:  ["calm","quiet","slow","gentle","still","rest","peace","soft","steady","easy"],
    encode(text) {
      const set = new Set(tokenize(text)); let h = 0, l = 0;
      for (const t of this.high) if (set.has(t)) h++;
      for (const t of this.low)  if (set.has(t)) l++;
      const arousal = roundN((h-l)/(h+l+1));
      return { model: this.id, score: roundN(clampN((h+l)/5)), arousal, signal: `Affective arousal: ${arousal > 0.2 ? "high" : arousal < -0.2 ? "low" : "neutral"} (${arousal}).` };
    }
  },
  social: {
    id: "social", description: "Social power, formality, and relational role",
    formal:   ["please","sir","doctor","professor","formally","respectfully","dear","hereby","shall"],
    informal: ["hey","yeah","dude","gonna","wanna","kinda","stuff","cool","ok","nah"],
    power:    ["must","authority","order","command","force","control","demand","require","enforce"],
    encode(text) {
      const set = new Set(tokenize(text)); let f = 0, i = 0, p = 0;
      for (const t of this.formal)   if (set.has(t)) f++;
      for (const t of this.informal) if (set.has(t)) i++;
      for (const t of this.power)    if (set.has(t)) p++;
      const register = f > i ? "formal" : i > f ? "informal" : "neutral";
      return { model: this.id, score: roundN(clampN((f+i+p)/6)), register, signal: `Social register: ${register}. Power: ${p}. Formal: ${f}. Informal: ${i}.` };
    }
  },
  reflected: {
    id: "reflected", description: "Implied attitude, belief, and speaker stance",
    certain:  ["obviously","clearly","certainly","definitely","always","never","must","will","know"],
    uncertain:["maybe","perhaps","might","could","possibly","uncertain","unclear","wonder","guess"],
    belief:   ["believe","feel","think","sense","assume","expect","trust","doubt","suspect"],
    encode(text) {
      const set = new Set(tokenize(text)); let c = 0, u = 0, b = 0;
      for (const t of this.certain)  if (set.has(t)) c++;
      for (const t of this.uncertain) if (set.has(t)) u++;
      for (const t of this.belief)   if (set.has(t)) b++;
      const stance = c > u ? "assertive" : u > c ? "tentative" : "neutral";
      return { model: this.id, score: roundN(clampN((c+u+b)/8)), stance, signal: `Stance: ${stance}. Certainty: ${c}. Uncertainty: ${u}. Belief: ${b}.` };
    }
  },
  thematic: {
    id: "thematic", description: "Topic structure — theme and information flow",
    encode(text) {
      const tokens = tokenize(text);
      if (!tokens.length) return { model: this.id, score: 0, theme: null, rheme: null, signal: "Empty." };
      const stop = new Set(["the","a","an","is","are","was","were","it","in","on","at","to","of","and","or","but","i","you","we"]);
      const m = tokens.filter(t => !stop.has(t));
      const split = Math.ceil(m.length * 0.35);
      const theme = m.slice(0, split).slice(0, 4).join(" ");
      const rheme = m.slice(split).slice(0, 6).join(" ");
      const density = roundN(m.length / (tokens.length || 1));
      return { model: this.id, score: roundN(clampN(density)), theme: theme||null, rheme: rheme||null, signal: `Theme: "${theme}". Rheme: "${rheme}". Density: ${density}.` };
    }
  }
};

// ── UNIFIED MEANING LOOP ──────────────────────────────
export function runSevenLayers(input, loopId) {
  const embeddings = {}; let totalScore = 0; const signals = [];
  for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
    const result = model.encode(input);
    embeddings[key] = result; signals.push(result.signal); totalScore += result.score || 0;
  }
  const meaningScore = roundN(totalScore / Object.keys(SEMANTIC_MODELS).length);
  const dominant = Object.entries(embeddings).sort((a,b) => (b[1].score||0)-(a[1].score||0))[0];
  return {
    vaultPayload: { loopId, input, embeddings, meaningScore, dominantLayer: dominant[0], signals },
    agentSignal: {
      loopId, meaningScore, dominantLayer: dominant[0],
      dominantDescription: SEMANTIC_MODELS[dominant[0]]?.description,
      affectiveArousal: embeddings.affective?.arousal,
      socialRegister: embeddings.social?.register,
      reflectedStance: embeddings.reflected?.stance,
      connotativePolarity: embeddings.connotative?.polarity,
      theme: embeddings.thematic?.theme,
      summary: signals.join(" | ")
    }
  };
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
  snapshot() { return this.loops.slice(-50); }
  summary() {
    const avg = k => this.loops.length ? roundN(this.loops.reduce((s,l)=>s+(l[k]||0),0)/this.loops.length) : 0;
    const layers = {};
    for (const l of this.loops) if (l.dominantLayer) layers[l.dominantLayer] = (layers[l.dominantLayer]||0)+1;
    return { totalLoops: this.loops.length, totalLoopsEver: this.totalLoopsEver, avgTension: avg("tensionScore"), avgMeaningScore: avg("meaningScore"), dominantLayers: layers };
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
  resolve(resolution, meaningResult) {
    this.resolution = resolution; this.closedAt = nowISO();
    return {
      id: this.id, input: this.input, resolution,
      openedAt: this.openedAt, closedAt: this.closedAt,
      inputEntropy: this.entropy, tensionScore: this.tensionScore, learningPressure: this.learningPressure,
      resonantLoops: this.resonantLoops,
      meaningScore: meaningResult.vaultPayload.meaningScore,
      dominantLayer: meaningResult.vaultPayload.dominantLayer,
      meaningEmbeddings: meaningResult.vaultPayload.embeddings
    };
  }
}

// ── PROJECT UNKNOWN — MAIN ENGINE ──────────────────────
export class ProjectUnknown {
  constructor(options = {}) {
    this.filePath = options.filePath || process.env.PROJECT_UNKNOWN_PATH || "data/project_unknown.local.json";
    this.vault = new FeedbackVault(this.filePath);
    this.identity = {
      name: "Project Unknown", version: "0.3.0",
      premise: "Every thought is its own feedback loop. Seven semantic models are the working parts. The vault grows forever. The intelligence is the vault.",
      semanticLayers: Object.keys(SEMANTIC_MODELS), createdAt: "2026-05-30"
    };
  }
  think(input) {
    const snapshot = this.vault.snapshot();
    const loop = new ThoughtLoop(input, snapshot);
    const meaning = runSevenLayers(input, loop.id);
    const retrieved = this.vault.retrieve(input, 5);
    const resolution = [
      `Seven-layer analysis. Dominant: ${meaning.vaultPayload.dominantLayer}. Score: ${meaning.vaultPayload.meaningScore}.`,
      `Tension: ${loop.tensionScore}. Learning pressure: ${loop.learningPressure}.`,
      retrieved.length ? `Vault: ${retrieved.length} prior loop(s). Strongest: "${retrieved[0]?.input?.slice(0,60)}" (${retrieved[0]?.relevance}).` : `No prior vault resonance.`
    ].join(" ");
    const entry = loop.resolve(resolution, meaning);
    this.vault.store(entry);
    return { identity: this.identity, agentSignal: meaning.agentSignal, vaultEntry: { id: entry.id, dominantLayer: entry.dominantLayer, meaningScore: entry.meaningScore, tensionScore: entry.tensionScore }, retrieved, vault: this.vault.summary() };
  }
  status() { return { identity: this.identity, vault: this.vault.summary() }; }
  recall(query, count = 8) { return { query, results: this.vault.retrieve(query, count), vaultSize: this.vault.loops.length }; }
  reset() { this.vault.loops = []; this.vault.totalLoopsEver = 0; this.vault.save(); return this.status(); }
}
