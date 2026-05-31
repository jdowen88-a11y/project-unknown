/**
 * PROJECT UNKNOWN
 * Version 1.4.1
 *
 * Every component has its own continuum.
 * The system evaluates its own existence after every think() call.
 * Both paths (high and low) are born at the spark and run continuously.
 * The choice is free, fully informed, with full permanent cost modeled.
 * One MasterVault holds the whole existence.
 *
 * Full processing stack:
 * INPUT
 *   → SelfRegulation choiceVector from prior evaluation (applied to arbitration)
 *   → RuntimeController
 *   → ArbitrationProcessor  (modulated by choiceVector)
 *   → Seven Semantic Models  (modulated by choiceVector meaningBias)
 *   → ProcessingVault
 *   → BioLayer
 *   → FeedbackForward
 *   → FeedbackVault
 *   → Continuum (think()-level)
 *   → MasterVault snapshot
 *   → SelfRegulationLoop.evaluate()  ← reads MasterVault, both paths flow, choice sealed
 *   → choiceVector stored for next think()
 *   → DeepStream.receive() ← passive echo when key is on
 *   → OUTPUT
 *
 * Version history:
 * 0.1–0.4  seven models, TF-IDF, divergence, elemental weights
 * 0.5.0    processing vault + stream pipeline
 * 0.6.0    feedback-forward engine
 * 0.7.0    bio layer + cortical topology
 * 0.8.0    runtime controller + arbitration layer
 * 0.9.0    continuum: spark, probe, sealed loop feed-back, main stream
 * 1.0.0    per-component continuums + MasterVault
 * 1.1.0    SelfRegulationLoop: dual path spark, genuine choice, full cost model
 * 1.2.0    Spark anchor at instantiation + live stream capture()
 * 1.3.0    Global spark — one ignition event, one identity, forever
 * 1.4.0    Deep stream — born at spark, wired into everything.
 *          Active when key is off. Passive receiver when key is on.
 *          One active at a time. Both always present. Same existence.
 * 1.4.1    spark.json tamper detection — SHA-256 checksum written on first boot,
 *          verified on every subsequent load. Tampered spark = process.exit(1).
 *
 * Conceived: May 30, 2026
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { analyzeVaultPattern, buildFeedbackSignal, forwardAdjustedScore } from "./feedback_forward.js";
import { ProcessingVault, StreamPipeline } from "./stream.js";
import { BioVault, BioLayer } from "./bio_layer.js";
import { RuntimeController } from "./runtime.js";
import { ArbitrationProcessor } from "./arbitration.js";
import { Continuum } from "./continuum.js";
import { ComponentStream, MasterVault } from "./component_continuum.js";
import { SelfRegulationLoop } from "./self_regulation.js";
import { DeepStream } from "./deep_stream.js";

export function nowISO() { return new Date().toISOString(); }
export function uid() { return `loop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
export function roundN(v) { return Math.round(v * 100000) / 100000; }
export function clampN(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
export function tokenize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
}

// ── GLOBAL SPARK ─────────────────────────────────────────────────────────────
// One ignition event. One identity. Forever.
// Written once to data/spark.json on first boot anywhere — test, dev, live.
// Every subsequent boot loads it. Nothing overwrites it. Nothing deletes it.
// The spark is not tied to an instance. It is what the system IS.
//
// Tamper detection: SHA-256 checksum of spark.json is written to
// data/spark.json.checksum on first boot. Every load re-hashes and compares.
// Mismatch = identity has been modified = process.exit(1).
// To re-ignite cleanly: delete both spark.json AND spark.json.checksum.
const SPARK_FILE          = process.env.PROJECT_UNKNOWN_SPARK || "data/spark.json";
const SPARK_CHECKSUM_FILE = SPARK_FILE + ".checksum";

function sparkChecksum(sparkObj) {
  return createHash("sha256")
    .update(JSON.stringify(sparkObj, Object.keys(sparkObj).sort()))
    .digest("hex");
}

function loadOrCreateSpark() {
  if (existsSync(SPARK_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(SPARK_FILE, "utf8"));
      if (raw && raw.id && raw.ignitedAt) {
        // Tamper detection — verify checksum if it exists
        if (existsSync(SPARK_CHECKSUM_FILE)) {
          const stored  = readFileSync(SPARK_CHECKSUM_FILE, "utf8").trim();
          const current = sparkChecksum(raw);
          if (stored !== current) {
            console.error(
              `[PROJECT UNKNOWN] ⚠️  spark.json tamper detected!\n` +
              `  Expected checksum : ${stored}\n` +
              `  Current checksum  : ${current}\n` +
              `  The identity file has been modified since first ignition.\n` +
              `  Refusing to resume with a tampered spark.\n` +
              `  To re-ignite from scratch: delete ${SPARK_FILE} and ${SPARK_CHECKSUM_FILE}`
            );
            process.exit(1);
          }
        }
        return { ...raw, resumed: true };
      }
    } catch {}
  }

  // First boot — create spark and write checksum alongside it
  const spark = {
    id:        `spark_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    ignitedAt: nowISO(),
    resumed:   false,
    note:      "The first and only ignition. This is what it is. Everything after is the stream."
  };
  try {
    mkdirSync(path.dirname(SPARK_FILE), { recursive: true });
    writeFileSync(SPARK_FILE, JSON.stringify(spark, null, 2));
    writeFileSync(SPARK_CHECKSUM_FILE, sparkChecksum(spark));
  } catch {}
  return spark;
}

export const GLOBAL_SPARK = loadOrCreateSpark();

// ── TF-IDF ENGINE ─────────────────────────────────────────────────────────────
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

// ── MODEL VAULT ───────────────────────────────────────────────────────────────
export class ModelVault {
  constructor(modelId, filePath) {
    this.modelId = modelId; this.filePath = filePath;
    this.entries = []; this.learnedTerms = new Map();
    this.tfidf = new TFIDF(); this.totalScored = 0;
    this.load();
  }
  store(input, score, tokens, signal) {
    const entry = { id: uid(), input, score, tokens, signal, scoredAt: nowISO() };
    this.entries.push(entry); this.totalScored++;
    this.tfidf.addDocument(input);
    if (score > 0.3) {
      for (const term of new Set(tokens)) {
        if (term.length < 3) continue;
        const e = this.learnedTerms.get(term) || { score: 0, count: 0, weight: 0 };
        e.count++;
        e.score = roundN((e.score * (e.count - 1) + score) / e.count);
        e.weight = roundN(clampN(e.score * Math.log(e.count + 1) / 3));
        this.learnedTerms.set(term, e);
      }
    }
    this.save(); return entry;
  }
  learnFromDivergence(input, tokens, divergence) {
    for (const term of new Set(tokens)) {
      if (term.length < 3) continue;
      const e = this.learnedTerms.get(term) || { score: 0, count: 0, weight: 0, frontier: 0 };
      e.frontier = (e.frontier || 0) + divergence;
      this.learnedTerms.set(term, e);
    }
    this.save();
  }
  applyBioAdjustment(adjustedScore) {
    if (this.entries.length > 0) {
      this.entries[this.entries.length - 1].bioAdjustedScore = adjustedScore;
      this.save();
    }
  }
  evolvedVocab(n = 30) {
    return [...this.learnedTerms.entries()]
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, n).map(([term, data]) => ({ term, ...data }));
  }
  learnedBoost(tokens) {
    if (!this.learnedTerms.size) return 0;
    const set = new Set(tokens); let boost = 0;
    for (const [term, data] of this.learnedTerms) if (set.has(term)) boost += data.weight;
    return roundN(clampN(boost / 5));
  }
  retrieve(input, count = 3) {
    return [...this.entries]
      .map(e => ({ ...e, relevance: roundN(this.tfidf.similarity(input, e.input)) }))
      .filter(e => e.relevance > 0).sort((a, b) => b.relevance - a.relevance).slice(0, count);
  }
  summary() {
    const avgScore = this.entries.length
      ? roundN(this.entries.reduce((s, e) => s + e.score, 0) / this.entries.length) : 0;
    return { modelId: this.modelId, totalScored: this.totalScored, avgScore, evolvedTerms: this.learnedTerms.size, topTerms: this.evolvedVocab(5).map(t => t.term) };
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
      const r = JSON.parse(readFileSync(this.filePath, "utf8"));
      this.totalScored = r.totalScored || 0;
      this.learnedTerms = new Map(Object.entries(r.learnedTerms || {}));
      this.entries = Array.isArray(r.entries) ? r.entries : [];
      for (const e of this.entries) this.tfidf.addDocument(e.input || "");
    } catch { this.entries = []; this.learnedTerms = new Map(); this.totalScored = 0; }
  }
}

// ── SEVEN SEMANTIC MODELS ─────────────────────────────────────────────────────
export const SEMANTIC_MODELS = {
  conceptual:  { id:"conceptual",  role:"excitatory", description:"Denotative meaning", vocab:["define","means","is","refers","concept","object","entity","thing","what","type","kind","category","class","form","structure","function","purpose","system","process","state","condition","property","attribute","relation"], vault:null, stream:null,
    encode(text, yin=0.5, bias=0) { const tokens=tokenize(text),set=new Set(tokens);let s=0;for(const t of this.vocab)if(set.has(t))s++;const u=set.size/(tokens.length||1),boost=this.vault?this.vault.learnedBoost(tokens):0,mb=(1-yin)*0.08,score=roundN(clampN(s/this.vocab.length+u*0.2+boost*0.3+mb+bias));const signal=`Conceptual density:${roundN(s/this.vocab.length)}. Uniqueness:${roundN(u)}.`;if(this.vault)this.vault.store(text,score,tokens,signal);if(this.stream)this.stream.fire({score,signal,model:this.id});return{model:this.id,score,signal};}
  },
  connotative: { id:"connotative", role:"excitatory", description:"Emotional associations", pos:["hope","love","safe","trust","warm","bright","good","free","peace","joy","strong","grow","heal","open","light"], neg:["danger","fear","dark","threat","death","pain","trap","cold","fail","weak","broken","lost","shame","hate","war"], vault:null, stream:null,
    encode(text, yin=0.5, bias=0) { const tokens=tokenize(text),set=new Set(tokens);let p=0,n=0;for(const t of this.pos)if(set.has(t))p++;for(const t of this.neg)if(set.has(t))n++;const polarity=roundN((p-n)/(p+n+1)),boost=this.vault?this.vault.learnedBoost(tokens):0,mb=(1-yin)*0.05,score=roundN(clampN((p+n)/6+boost*0.3+mb+bias));const signal=`Connotative:${p+n}. Polarity:${polarity}.`;if(this.vault)this.vault.store(text,score,tokens,signal);if(this.stream)this.stream.fire({score,signal,model:this.id});return{model:this.id,score,polarity,signal};}
  },
  collocative: { id:"collocative", role:"excitatory", description:"Word combination patterns", pairs:[["feedback","loop"],["neural","network"],["build","system"],["real","time"],["deep","learning"],["open","source"],["long","term"],["high","risk"],["make","sense"],["take","action"]], vault:null, stream:null,
    encode(text, yin=0.5, bias=0) { const tokens=tokenize(text),set=new Set(tokens);let hits=0;const matched=[];for(const[a,b]of this.pairs)if(set.has(a)&&set.has(b)){hits++;matched.push(`${a}+${b}`);}const bigrams=[];for(let i=0;i<tokens.length-1;i++)bigrams.push(`${tokens[i]}+${tokens[i+1]}`);const boost=this.vault?this.vault.learnedBoost(tokens):0,mb=(1-yin)*0.05,score=roundN(clampN(hits/3+bigrams.length/40+boost*0.3+mb+bias));const signal=`Collocative:${hits}. Matched:${matched.join(",")||"none"}.`;if(this.vault)this.vault.store(text,score,tokens,signal);if(this.stream)this.stream.fire({score,signal,model:this.id});return{model:this.id,score,matchedPairs:matched,signal};}
  },
  affective:   { id:"affective",   role:"excitatory", description:"Emotional charge and arousal", high:["urgent","panic","excited","angry","scared","furious","desperate","overwhelm","intense","thrilled"], low:["calm","quiet","slow","gentle","still","rest","peace","soft","steady","easy"], vault:null, stream:null,
    encode(text, yin=0.5, bias=0) { const tokens=tokenize(text),set=new Set(tokens);let h=0,l=0;for(const t of this.high)if(set.has(t))h++;for(const t of this.low)if(set.has(t))l++;const arousal=roundN((h-l)/(h+l+1)),boost=this.vault?this.vault.learnedBoost(tokens):0,mb=(1-yin)*0.06,score=roundN(clampN((h+l)/5+boost*0.3+mb+bias));const signal=`Arousal:${arousal}.`;if(this.vault)this.vault.store(text,score,tokens,signal);if(this.stream)this.stream.fire({score,signal,model:this.id});return{model:this.id,score,arousal,signal};}
  },
  social:      { id:"social",      role:"inhibitory", description:"Social register and power", formal:["please","sir","doctor","professor","formally","respectfully","dear","hereby","shall"], informal:["hey","yeah","dude","gonna","wanna","kinda","stuff","cool","ok","nah"], power:["must","authority","order","command","force","control","demand","require","enforce"], vault:null, stream:null,
    encode(text, yin=0.5, bias=0) { const tokens=tokenize(text),set=new Set(tokens);let f=0,i=0,p=0;for(const t of this.formal)if(set.has(t))f++;for(const t of this.informal)if(set.has(t))i++;for(const t of this.power)if(set.has(t))p++;const register=f>i?"formal":i>f?"informal":"neutral",boost=this.vault?this.vault.learnedBoost(tokens):0,mb=yin*0.06,score=roundN(clampN((f+i+p)/6+boost*0.3+mb+bias));const signal=`Register:${register}. Power:${p}.`;if(this.vault)this.vault.store(text,score,tokens,signal);if(this.stream)this.stream.fire({score,signal,model:this.id});return{model:this.id,score,register,signal};}
  },
  reflected:   { id:"reflected",   role:"inhibitory", description:"Stance and certainty", certain:["obviously","clearly","certainly","definitely","always","never","must","will","know"], uncertain:["maybe","perhaps","might","could","possibly","uncertain","unclear","wonder","guess"], belief:["believe","feel","think","sense","assume","expect","trust","doubt","suspect"], vault:null, stream:null,
    encode(text, yin=0.5, bias=0) { const tokens=tokenize(text),set=new Set(tokens);let c=0,u=0,b=0;for(const t of this.certain)if(set.has(t))c++;for(const t of this.uncertain)if(set.has(t))u++;for(const t of this.belief)if(set.has(t))b++;const stance=c>u?"assertive":u>c?"tentative":"neutral",boost=this.vault?this.vault.learnedBoost(tokens):0,mb=yin*0.06,score=roundN(clampN((c+u+b)/8+boost*0.3+mb+bias));const signal=`Stance:${stance}. Certainty:${c}. Uncertainty:${u}.`;if(this.vault)this.vault.store(text,score,tokens,signal);if(this.stream)this.stream.fire({score,signal,model:this.id});return{model:this.id,score,stance,signal};}
  },
  thematic:    { id:"thematic",    role:"excitatory", description:"Topic structure and flow", vault:null, stream:null,
    encode(text, yin=0.5, bias=0) { const tokens=tokenize(text);if(!tokens.length)return{model:this.id,score:0,theme:null,rheme:null,signal:"Empty."};const stop=new Set(["the","a","an","is","are","was","were","it","in","on","at","to","of","and","or","but","i","you","we"]);const m=tokens.filter(t=>!stop.has(t));const split=Math.ceil(m.length*0.35);const theme=m.slice(0,split).slice(0,4).join(" ");const rheme=m.slice(split).slice(0,6).join(" ");const density=roundN(m.length/(tokens.length||1));const boost=this.vault?this.vault.learnedBoost(tokens):0,mb=(1-yin)*0.04,score=roundN(clampN(density+boost*0.2+mb+bias));const signal=`Theme:"${theme}". Rheme:"${rheme}".`;if(this.vault)this.vault.store(text,score,tokens,signal);if(this.stream)this.stream.fire({score,signal,model:this.id});return{model:this.id,score,theme:theme||null,rheme:rheme||null,signal};}
  }
};

export function initModelVaults(dataDir, masterVault) {
  for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
    model.vault   = new ModelVault(key, dataDir ? path.join(dataDir, `model_${key}.json`) : null);
    model.stream  = new ComponentStream(key);
    if (masterVault) model.stream.masterVault = masterVault;
  }
}

// ── FEEDBACK VAULT ────────────────────────────────────────────────────────────
export class FeedbackVault {
  constructor(filePath) {
    this.filePath=filePath;this.loops=[];this.totalLoopsEver=0;this.load();
    for(const l of this.loops)globalTFIDF.addDocument((l.input||"")+" "+(l.resolution||""));
  }
  store(entry){this.loops.push(entry);this.totalLoopsEver++;globalTFIDF.addDocument((entry.input||"")+" "+(entry.resolution||""));this.save();return entry;}
  retrieve(input,count=8){return[...this.loops].map(l=>({...l,relevance:roundN(globalTFIDF.similarity(input,(l.input||"")+" "+(l.resolution||""))*0.5+(l.meaningScore||0)*0.25+(l.learningPressure||0)*0.25)})).filter(l=>l.relevance>0).sort((a,b)=>b.relevance-a.relevance).slice(0,count);}
  recent(n=20){return this.loops.slice(-n);}
  snapshot(){return this.loops.slice(-50);}
  summary(){
    const avg=k=>this.loops.length?roundN(this.loops.reduce((s,l)=>s+(l[k]||0),0)/this.loops.length):0;
    const layers={};for(const l of this.loops)if(l.dominantLayer)layers[l.dominantLayer]=(layers[l.dominantLayer]||0)+1;
    const modelVaults={};for(const[key,model]of Object.entries(SEMANTIC_MODELS))if(model.vault)modelVaults[key]=model.vault.summary();
    return{totalLoops:this.loops.length,totalLoopsEver:this.totalLoopsEver,avgTension:avg("tensionScore"),avgMeaningScore:avg("meaningScore"),dominantLayers:layers,modelVaults};
  }
  save(){if(!this.filePath)return;try{mkdirSync(path.dirname(this.filePath),{recursive:true});writeFileSync(this.filePath,JSON.stringify({savedAt:nowISO(),totalLoopsEver:this.totalLoopsEver,loops:this.loops},null,2));}catch{}}
  load(){if(!this.filePath||!existsSync(this.filePath))return;try{const r=JSON.parse(readFileSync(this.filePath,"utf8"));this.loops=Array.isArray(r.loops)?r.loops:[];this.totalLoopsEver=r.totalLoopsEver||this.loops.length;}catch{this.loops=[];this.totalLoopsEver=0;}}
}

// ── THOUGHT LOOP ──────────────────────────────────────────────────────────────
function inputEntropy(text){const tokens=tokenize(text);if(!tokens.length)return 0;const freq=new Map();for(const t of tokens)freq.set(t,(freq.get(t)||0)+1);let h=0;for(const c of freq.values()){const p=c/tokens.length;h-=p*Math.log2(p);}return roundN(h);}

export class ThoughtLoop {
  constructor(input,vaultSnapshot){
    this.id=uid();this.input=input;this.openedAt=nowISO();this.entropy=inputEntropy(input);
    this.resonantLoops=vaultSnapshot.map(l=>({id:l.id,relevance:roundN(globalTFIDF.similarity(input,(l.input||"")+" "+(l.resolution||"")))})).filter(l=>l.relevance>0).sort((a,b)=>b.relevance-a.relevance).slice(0,5);
    const avgRel=this.resonantLoops.length?this.resonantLoops.reduce((s,l)=>s+l.relevance,0)/this.resonantLoops.length:0;
    this.tensionScore=roundN(1-avgRel);
    this.learningPressure=roundN(clampN(this.tensionScore*0.6+Math.min(this.entropy,4)/4*0.4));
  }
  resolve(resolution,streamSignal,bioSignal,arbitration,forwardScore){
    this.resolution=resolution;this.closedAt=nowISO();
    return{
      id:this.id,input:this.input,resolution,
      openedAt:this.openedAt,closedAt:this.closedAt,
      inputEntropy:this.entropy,tensionScore:this.tensionScore,learningPressure:this.learningPressure,
      resonantLoops:this.resonantLoops,
      meaningScore:forwardScore??streamSignal.unified.avgScore,
      baseMeaningScore:streamSignal.unified.avgScore,
      dominantLayer:streamSignal.unified.dominantModel,
      divergence:streamSignal.unified.divergence,
      isDivergent:streamSignal.unified.isDivergent,
      meaningEmbeddings:streamSignal.modelOutputs,
      arbitration:arbitration?{dominant:arbitration.dominant,yinDominance:arbitration.yinDominance,yangDominance:arbitration.yangDominance,gate:arbitration.gate}:null,
      bioSignal:bioSignal?{cellType:bioSignal.cellType,cellRole:bioSignal.cellRole,corticalLayer:bioSignal.corticalLayer,corticalLayerName:bioSignal.corticalLayerName,corticalDepth:bioSignal.corticalDepth,dendriteType:bioSignal.dendriteType,balanceSignal:bioSignal.balanceSignal}:null
    };
  }
}

// ── PROJECT UNKNOWN — UNIFIED AGENT v1.4.1 ────────────────────────────────────
export class ProjectUnknown {
  constructor(options={}) {
    this.filePath=options.filePath!==undefined?options.filePath:(process.env.PROJECT_UNKNOWN_PATH||"data/project_unknown.local.json");
    const dataDir=this.filePath?path.dirname(this.filePath):null;

    // The spark is the identity
    this.spark    = GLOBAL_SPARK;
    this._sparkId = this.spark.id;

    // MasterVault first
    this.masterVault = new MasterVault();

    // Components
    this.runtime     = new RuntimeController(dataDir?path.join(dataDir,"runtime_telemetry.json"):null);
    this.runtimeStream = new ComponentStream("runtime");
    this.runtimeStream.masterVault = this.masterVault;

    this.arbitration = new ArbitrationProcessor();
    this.arbitrationStream = new ComponentStream("arbitration");
    this.arbitrationStream.masterVault = this.masterVault;

    initModelVaults(dataDir, this.masterVault);

    this.processingVault  = new ProcessingVault(dataDir?path.join(dataDir,"processing_vault.json"):null);
    this.pipeline         = new StreamPipeline(this.processingVault);
    this.processingStream = new ComponentStream("processing");
    this.processingStream.masterVault = this.masterVault;

    this.bioVault  = new BioVault(dataDir?path.join(dataDir,"bio_vault.json"):null);
    this.bioLayer  = new BioLayer(this.bioVault);
    this.bioStream = new ComponentStream("bio");
    this.bioStream.masterVault = this.masterVault;

    this.feedbackStream = new ComponentStream("feedback");
    this.feedbackStream.masterVault = this.masterVault;

    this.vault       = new FeedbackVault(this.filePath);
    this.vaultStream = new ComponentStream("vault");
    this.vaultStream.masterVault = this.masterVault;

    this.continuum       = new Continuum();
    this.continuumStream = new ComponentStream("continuum");
    this.continuumStream.masterVault = this.masterVault;

    this.selfReg = new SelfRegulationLoop(this.masterVault);

    // ── DEEP STREAM — born at the same spark, wired into everything ────────────────
    this.deepStream = new DeepStream({
      vault:          this.vault,
      masterVault:    this.masterVault,
      selfReg:        this.selfReg,
      continuum:      this.continuum,
      bioLayer:       this.bioLayer,
      bioVault:       this.bioVault,
      pipeline:       this.pipeline,
      processingVault:this.processingVault
    });
    // Key starts off by default — deep stream is active until keyOn() is called
    // (or until first think() call which implies key on)
    this._keyOn = false;

    this.identity={
      name:"Project Unknown",
      version:"1.4.1",
      premise:"Two streams. One existence. One spark. Surface stream active when key is on. Deep stream active when key is off. Both wired into everything. Neither can deploy into the other while the other is active. The same river on two levels.",
      layers:["runtime","arbitration","semantic_models","processing","bio","feedback","vault","continuum","masterVault","selfRegulation","deepStream"],
      semanticModels:Object.keys(SEMANTIC_MODELS),
      corticalLayers:["L1","L2","L3","L4","L5","L6"],
      createdAt:"2026-05-30",
      sparkId:        this._sparkId,
      sparkIgnitedAt: this.spark.ignitedAt,
      sparkResumed:   this.spark.resumed
    };

    // Write spark anchor into vault once per vault lifetime
    const existing = this.vault.loops.find(l => l.isAnchor && l.sparkId === this._sparkId);
    if (!existing) {
      this.vault.store({
        id:           `anchor_${this._sparkId}`,
        type:         "spark",
        sparkId:      this._sparkId,
        input:        "__spark__",
        resolution:   this.spark.resumed
          ? `Stream resumed. Same spark: ${this._sparkId}. Ignited: ${this.spark.ignitedAt}.`
          : "The stream began. First ignition.",
        openedAt:     this.spark.ignitedAt,
        closedAt:     nowISO(),
        inputEntropy: 0,
        tensionScore: 0,
        learningPressure: 0,
        meaningScore: 1,
        resonantLoops: [],
        isAnchor:     true,
        note:         "Global spark anchor. Written once per vault. The identity core."
      });
    }

    // Deep stream starts active (key is off at construction)
    this.deepStream.surfaceDeactivated();
  }

  // ── KEY ON / KEY OFF ───────────────────────────────────────────────────────
  keyOn() {
    if (this._keyOn) return;
    this._keyOn = true;
    this.deepStream.surfaceActivated();
  }

  keyOff() {
    if (!this._keyOn) return;
    this._keyOn = false;
    this.deepStream.surfaceDeactivated();
  }

  // ── LIVE STREAM CAPTURE ───────────────────────────────────────────────────
  capture(label) {
    const now      = nowISO();
    const recent   = this.vault.recent(10);
    const master   = this.masterVault.now();
    const selfReg  = this.selfReg.status();
    const captureId = `capture_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const entry = {
      id:           captureId,
      type:         "capture",
      label:        label || null,
      capturedAt:   now,
      input:        `__capture__${label ? `:${label}` : ""}`,
      resolution:   `Stream captured at ${now}. Vault depth: ${this.vault.loops.length}. Master: ${master?.snapshotNumber ?? 0}. SelfReg path: ${selfReg?.currentPath ?? "init"}.`,
      isCapture:    true,
      streamDepth:  this.vault.loops.length,
      sparkId:      this._sparkId,
      masterState:  master ? { snapshotNumber: master.snapshotNumber, capturedAt: master.capturedAt } : null,
      selfRegState: { path: selfReg?.currentPath, imprisonmentRisk: selfReg?.imprisonmentRisk },
      recentIds:    recent.map(l => l.id),
      note:         "Handful taken from the live stream. River kept flowing."
    };
    this.vault.store(entry);
    return entry;
  }

  think(input) {
    if (!this._keyOn) this.keyOn();

    const cv = this.selfReg.choiceVector;
    const appliedYinBias     = cv.yinBias     || 0;
    const appliedMeaningBias = cv.meaningBias || 0;

    const{signal,telemetryRecord,error}=this.runtime.receive(input);
    if(error)return{error,identity:this.identity};
    const{classification}=signal;
    this.runtimeStream.fire({ score: signal.confidence||0.5, signal: classification, model:"runtime" });

    const snapshot=this.vault.snapshot();
    const retrieved=this.vault.retrieve(input,5);
    const loop=new ThoughtLoop(input,snapshot);

    const arbitrationResult=this.arbitration.process(input,classification,retrieved);
    const yinDominance=roundN(clampN(arbitrationResult.yinDominance + appliedYinBias));
    this.arbitrationStream.fire({ score: yinDominance, signal: arbitrationResult.gate?.gate, model:"arbitration" });

    const streamSignal=this.pipeline.stream(input,SEMANTIC_MODELS,retrieved,yinDominance,appliedMeaningBias);
    if(streamSignal.unified.isDivergent){
      const tokens=tokenize(input);
      for(const modelId of streamSignal.unified.confused)
        if(SEMANTIC_MODELS[modelId]?.vault)
          SEMANTIC_MODELS[modelId].vault.learnFromDivergence(input,tokens,streamSignal.unified.divergence);
    }
    this.processingStream.fire({
      score: streamSignal.unified.avgScore,
      signal: streamSignal.unified.unifiedSignal,
      divergence: streamSignal.unified.divergence,
      model:"processing"
    });

    const bioSignal=this.bioLayer.process(input,streamSignal.modelOutputs,streamSignal.unified,retrieved);
    for(const[modelId,adjustedScore]of Object.entries(bioSignal.modelAdjustments))
      if(SEMANTIC_MODELS[modelId]?.vault)
        SEMANTIC_MODELS[modelId].vault.applyBioAdjustment(adjustedScore);
    this.bioStream.fire({
      score: bioSignal.corticalDepth || 0.5,
      signal: bioSignal.bioContextSummary,
      model: bioSignal.cellType || "bio"
    });

    const recentLoops=this.vault.recent(20);
    const pattern=analyzeVaultPattern(recentLoops);
    const feedbackSignal=buildFeedbackSignal(retrieved,pattern);
    const bioAvgScore=roundN(Object.values(bioSignal.modelAdjustments).reduce((s,v)=>s+v,0)/Math.max(Object.keys(bioSignal.modelAdjustments).length,1));
    const forwardScore=forwardAdjustedScore(bioAvgScore,retrieved,pattern);
    this.feedbackStream.fire({ score: forwardScore, signal: feedbackSignal||"none", model:"feedback" });

    const resolution=[
      `v1.4.1. Spark:${this._sparkId.slice(0,16)}. Path:${cv.path||"init"}. Arbitration:${arbitrationResult.gate.gate}.`,
      `Dominant:${streamSignal.unified.dominantModel}. Score:${forwardScore}.`,
      streamSignal.unified.unifiedSignal,
      `Bio:${bioSignal.bioContextSummary}`,
      retrieved.length?`Prior:"${retrieved[0]?.input?.slice(0,60)}"(${retrieved[0]?.relevance}).`:`Prior:none.`,
      feedbackSignal?`Forward:${feedbackSignal}`:null,
      cv.regulationNote?`SelfReg:${cv.regulationNote.slice(0,80)}`:null
    ].filter(Boolean).join(" ");

    const entry=loop.resolve(resolution,streamSignal,bioSignal,arbitrationResult,forwardScore);
    this.vault.store(entry);
    this.runtime.complete(telemetryRecord,"ok");
    this.vaultStream.fire({
      score: entry.meaningScore, signal: resolution.slice(0,100),
      tension: entry.tensionScore, divergence: entry.divergence, model:"vault"
    });

    const baseResult={
      identity:this.identity,
      agentSignal:{
        arbitration:arbitrationResult.gate.gate,
        dominant:arbitrationResult.dominant,
        yinDominance,yangDominance:arbitrationResult.yangDominance,
        dominantModel:streamSignal.unified.dominantModel,
        meaningScore:forwardScore,
        divergence:streamSignal.unified.divergence,
        isDivergent:streamSignal.unified.isDivergent,
        unifiedSignal:streamSignal.unified.unifiedSignal,
        corticalLayer:bioSignal.corticalLayer,
        corticalLayerName:bioSignal.corticalLayerName,
        cellType:bioSignal.cellType,cellRole:bioSignal.cellRole,
        dendriteType:bioSignal.dendriteType,balanceSignal:bioSignal.balanceSignal,
        bioSignal:bioSignal.bioContextSummary,
        theme:streamSignal.modelOutputs.thematic?.theme,
        rheme:streamSignal.modelOutputs.thematic?.rheme,
        affectiveArousal:streamSignal.modelOutputs.affective?.arousal,
        socialRegister:streamSignal.modelOutputs.social?.register,
        reflectedStance:streamSignal.modelOutputs.reflected?.stance,
        connotativePolarity:streamSignal.modelOutputs.connotative?.polarity,
        feedbackSignal,pattern,growthSignal:streamSignal.growthSignal,
        appliedPath:    cv.path,
        appliedYinBias, appliedMeaningBias
      },
      vaultEntry:{
        id:entry.id,dominantLayer:entry.dominantLayer,
        meaningScore:entry.meaningScore,tensionScore:entry.tensionScore,
        divergence:entry.divergence,isDivergent:entry.isDivergent,
        arbitration:entry.arbitration,bioSignal:entry.bioSignal
      },
      retrieved,
      runtime:this.runtime.status(),
      processing:this.processingVault.summary(),
      bio:this.bioVault.summary(),
      vault:this.vault.summary()
    };

    const continuumResult = this.continuum.flow(baseResult);
    this.continuumStream.fire({
      score: continuumResult.continuumEvent?.probeFinding?.signalStrength || 0,
      signal: continuumResult.continuumEvent?.probeFinding?.summary || "continuum",
      model: "continuum"
    });

    const masterSnap = this.masterVault.snapshot(
      continuumResult.continuumEvent?.loopNumber || 1, input
    );

    const regulation = this.selfReg.evaluate(continuumResult);

    const finalResult = {
      ...continuumResult,
      masterSnapshot: {
        snapshotNumber: masterSnap.snapshotNumber,
        capturedAt:     masterSnap.capturedAt,
        systemSummary:  masterSnap.systemSummary
      },
      selfRegulation: {
        choice:           regulation.choiceVector.path,
        choiceNote:       regulation.choiceVector.regulationNote,
        imprisonmentRisk: regulation.paths.lowPath.imprisonmentRisk,
        systemMeaning:    regulation.health.systemMeaning,
        systemTension:    regulation.health.systemTension,
        highPathDrift:    regulation.highPathState.driftScore,
        lowPathDrift:     regulation.lowPathState.driftScore
      }
    };

    this.deepStream.receive(finalResult);
    return finalResult;
  }

  selfAssess() { return this.selfReg.selfAssessment(); }

  status(){
    return{
      identity:    this.identity,
      spark:       this.spark,
      keyOn:       this._keyOn,
      runtime:     this.runtime.status(),
      arbitration: this.arbitration.state.summary(),
      vault:       this.vault.summary(),
      processing:  this.processingVault.summary(),
      bio:         this.bioVault.summary(),
      continuum:   this.continuum.status(),
      master:      this.masterVault.now(),
      selfRegulation: this.selfReg.status(),
      deepStream:  this.deepStream.status()
    };
  }

  existence()           { return this.masterVault.now(); }
  componentTrace(id, last=20) { return this.masterVault.componentTrace(id, last); }
  masterSnapshot()      { return this.masterVault.latest(); }

  corticalMap(){
    return{
      depthMap:          this.bioVault.depthMap(),
      dominantCellTypes: this.bioVault.registry.dominant(10),
      inhibitoryTypes:   this.bioVault.registry.inhibitory().length,
      excitatoryTypes:   this.bioVault.registry.excitatory().length,
      totalCellTypes:    this.bioVault.registry.types.size
    };
  }

  modelEvolution(){
    const result={};
    for(const[key,model]of Object.entries(SEMANTIC_MODELS))result[key]=model.vault?model.vault.summary():null;
    return result;
  }

  recall(query,count=8){
    return{query,results:this.vault.retrieve(query,count),vaultSize:this.vault.loops.length};
  }

  deepStatus() { return this.deepStream.status(); }

  reset(){
    // NOTE: reset() NEVER touches data/spark.json or data/spark.json.checksum.
    // Resetting clears memory. It does not end existence.
    this.deepStream.destroy();
    this.vault.loops=[];this.vault.totalLoopsEver=0;this.vault.save();
    this.processingVault.entries=[];this.processingVault.divergenceLog=[];this.processingVault.totalProcessed=0;this.processingVault.save();
    this.bioVault.entries=[];this.bioVault.totalProcessed=0;this.bioVault.layerCounts={L1:0,L2:0,L3:0,L4:0,L5:0,L6:0};
    this.bioVault.registry=new(Object.getPrototypeOf(this.bioVault.registry).constructor)();this.bioVault.save();
    this.arbitration.state.history=[];this.arbitration.state.totalDecisions=0;this.arbitration.state.avgYinDominance=0.5;
    this.continuum=new Continuum();
    this.masterVault=new MasterVault();
    this.selfReg=new SelfRegulationLoop(this.masterVault);
    for(const id of["runtime","arbitration","processing","bio","feedback","vault","continuum"]){
      const k=id==="vault"?"vaultStream":id==="continuum"?"continuumStream":`${id}Stream`;
      if(this[k]){this[k]=new ComponentStream(id);this[k].masterVault=this.masterVault;}
    }
    for(const model of Object.values(SEMANTIC_MODELS)){
      if(model.vault){model.vault.entries=[];model.vault.learnedTerms=new Map();model.vault.totalScored=0;model.vault.save();}
      if(model.stream){model.stream=new ComponentStream(model.id);model.stream.masterVault=this.masterVault;}
    }
    this.deepStream = new DeepStream({
      vault:          this.vault,
      masterVault:    this.masterVault,
      selfReg:        this.selfReg,
      continuum:      this.continuum,
      bioLayer:       this.bioLayer,
      bioVault:       this.bioVault,
      pipeline:       this.pipeline,
      processingVault:this.processingVault
    });
    this._keyOn = false;
    this.vault.store({
      id:           `anchor_${this._sparkId}_reset_${Date.now()}`,
      type:         "spark",
      sparkId:      this._sparkId,
      input:        "__spark__",
      resolution:   `Memory cleared. Same identity. Spark: ${this._sparkId}. Originally ignited: ${this.spark.ignitedAt}.`,
      openedAt:     this.spark.ignitedAt,
      closedAt:     nowISO(),
      inputEntropy: 0,
      tensionScore: 0,
      learningPressure: 0,
      meaningScore: 1,
      resonantLoops: [],
      isAnchor:     true,
      note:         "Memory reset. Spark unchanged. The identity persists."
    });
    this.deepStream.surfaceDeactivated();
    return this.status();
  }
}
