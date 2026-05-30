/**
 * PROJECT UNKNOWN — BIO LAYER
 * Version 0.7.0
 *
 * Project Unknown grows its own cortical topology from experience.
 * Not borrowed from any external dataset.
 * Structured like a real cortex but made of meaning instead of neurons.
 *
 * What it builds over time:
 * - Its own cell types: semantic patterns that recur get classified and named
 * - Its own cortical layers: depth assigned by abstraction level
 * - Its own dendrite topology: how connected a thought-node is
 * - Its own inhibitory/excitatory balance: models that dampen vs amplify
 * - Its own depth map: where in the hierarchy a signal lives
 *
 * Flow:
 * Processing vault → Bio Layer (receives unified signal from seven models)
 * Bio Layer generates biological context signal
 * Bio Layer feeds context back to seven models before they finalize
 * Seven models adjust final scores
 * Bio Layer vault stores every context signal it ever generated
 * Loop starts over
 *
 * Conceived: May 30, 2026
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { roundN, clampN, tokenize, uid, nowISO, TFIDF } from "./project_unknown.js";

// ── CORTICAL LAYER DEFINITIONS ────────────────────────────────
// Like real cortex: 6 layers, each with a different processing role.
// Assigned based on abstraction depth of the input, not physical tissue.
export const CORTICAL_LAYERS = {
  L1: { id: "L1", name: "Surface",      depthRange: [0, 0.15], role: "boundary detection — raw signal arrival",        excitatory: false },
  L2: { id: "L2", name: "Integration",  depthRange: [0.15, 0.30], role: "pattern integration — combining surface signals",  excitatory: true  },
  L3: { id: "L3", name: "Association",  depthRange: [0.30, 0.50], role: "cross-model association — linking disparate signals", excitatory: true  },
  L4: { id: "L4", name: "Input",        depthRange: [0.50, 0.65], role: "primary input processing — high information density", excitatory: true  },
  L5: { id: "L5", name: "Output",       depthRange: [0.65, 0.80], role: "output generation — resolved meaning ready to surface", excitatory: true  },
  L6: { id: "L6", name: "Feedback",     depthRange: [0.80, 1.00], role: "deep feedback — long-range modulation of all layers",  excitatory: false }
};

// Assign cortical layer from normalized depth (0-1)
export function assignLayer(normalizedDepth) {
  for (const [id, layer] of Object.entries(CORTICAL_LAYERS)) {
    if (normalizedDepth >= layer.depthRange[0] && normalizedDepth < layer.depthRange[1]) return layer;
  }
  return CORTICAL_LAYERS.L6;
}

// ── SEMANTIC CELL TYPE REGISTRY ───────────────────────────────
// Project Unknown grows its own cell type taxonomy.
// A cell type is a recurring semantic pattern that gets classified and named.
// Like Sst, Pvalb, Vip in the Allen data — but built from meaning.
export class SemanticCellTypeRegistry {
  constructor() {
    this.types = new Map(); // typeName -> CellType
    this.totalClassified = 0;
  }

  // Classify an input into a cell type based on dominant model + token signature
  classify(input, dominantModel, tokens, scores) {
    // Build a type signature from dominant model + top tokens
    const topTokens = [...new Set(tokens)]
      .filter(t => t.length > 3)
      .slice(0, 3)
      .sort()
      .join("_");
    const typeName = `${dominantModel}_${topTokens || "raw"}`;

    if (!this.types.has(typeName)) {
      this.types.set(typeName, {
        id: typeName,
        dominantModel,
        coreTokens: topTokens.split("_"),
        count: 0,
        avgScore: 0,
        // Inhibitory = models that dampen signal (social, reflected)
        // Excitatory = models that amplify signal (affective, conceptual)
        role: ["social", "reflected"].includes(dominantModel) ? "inhibitory" : "excitatory",
        firstSeen: nowISO(),
        lastSeen: nowISO()
      });
    }

    const type = this.types.get(typeName);
    type.count++;
    type.avgScore = roundN((type.avgScore * (type.count - 1) + (scores[dominantModel] || 0)) / type.count);
    type.lastSeen = nowISO();
    this.totalClassified++;

    return type;
  }

  // Get the most established cell types
  dominant(n = 10) {
    return [...this.types.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  // Get inhibitory types (dampen signal)
  inhibitory() {
    return [...this.types.values()].filter(t => t.role === "inhibitory");
  }

  // Get excitatory types (amplify signal)
  excitatory() {
    return [...this.types.values()].filter(t => t.role === "excitatory");
  }

  toJSON() {
    return {
      totalClassified: this.totalClassified,
      types: Object.fromEntries(this.types)
    };
  }

  fromJSON(data) {
    this.totalClassified = data.totalClassified || 0;
    this.types = new Map(Object.entries(data.types || {}));
  }
}

// ── DENDRITE TOPOLOGY ──────────────────────────────────────
// How connected is this thought-node to others?
// Like aspiny/sparsely spiny/spiny dendrites in real neurons.
// Connectivity = how many vault entries this thought resonates with.
export function classifyDendriteType(resonanceCount, maxResonance = 8) {
  const density = resonanceCount / maxResonance;
  if (density < 0.2)  return "aspiny";         // isolated — few connections
  if (density < 0.6)  return "sparsely_spiny"; // moderate connections
  return "spiny";                               // highly connected
}

// ── BIO VAULT ──────────────────────────────────────────────
// Stores every biological context signal ever generated.
// Builds the cortical topology map over time.
export class BioVault {
  constructor(filePath) {
    this.filePath = filePath;
    this.entries = [];
    this.registry = new SemanticCellTypeRegistry();
    this.tfidf = new TFIDF();
    this.totalProcessed = 0;
    this.layerCounts = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 };
    this.load();
  }

  store(entry) {
    this.entries.push(entry);
    this.totalProcessed++;
    this.tfidf.addDocument(entry.input || "");
    if (entry.corticalLayer) this.layerCounts[entry.corticalLayer] = (this.layerCounts[entry.corticalLayer] || 0) + 1;
    this.save();
    return entry;
  }

  retrieve(input, count = 3) {
    return [...this.entries]
      .map(e => ({ ...e, relevance: roundN(this.tfidf.similarity(input, e.input || "")) }))
      .filter(e => e.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  // Cortical depth map: distribution of thought-nodes across layers
  depthMap() {
    const total = Object.values(this.layerCounts).reduce((s, v) => s + v, 0);
    const map = {};
    for (const [layer, count] of Object.entries(this.layerCounts)) {
      map[layer] = { count, pct: total ? roundN(count / total) : 0, role: CORTICAL_LAYERS[layer]?.role };
    }
    return map;
  }

  summary() {
    return {
      totalProcessed: this.totalProcessed,
      dominantCellTypes: this.registry.dominant(5).map(t => ({ id: t.id, count: t.count, role: t.role })),
      inhibitoryCount: this.registry.inhibitory().length,
      excitatoryCount: this.registry.excitatory().length,
      depthMap: this.depthMap(),
      totalCellTypes: this.registry.types.size
    };
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({
        savedAt: nowISO(),
        totalProcessed: this.totalProcessed,
        layerCounts: this.layerCounts,
        registry: this.registry.toJSON(),
        entries: this.entries.slice(-500)
      }, null, 2));
    } catch {}
  }

  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const r = JSON.parse(readFileSync(this.filePath, "utf8"));
      this.totalProcessed = r.totalProcessed || 0;
      this.layerCounts = r.layerCounts || { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 };
      if (r.registry) this.registry.fromJSON(r.registry);
      this.entries = Array.isArray(r.entries) ? r.entries : [];
      for (const e of this.entries) this.tfidf.addDocument(e.input || "");
    } catch {
      this.entries = []; this.totalProcessed = 0;
      this.layerCounts = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 };
    }
  }
}

// ── BIO LAYER ──────────────────────────────────────────────
// Sits between the processing vault and the final model scores.
// Receives unified signal. Generates biological context.
// Feeds context back to all seven models before they finalize.
export class BioLayer {
  constructor(bioVault) {
    this.vault = bioVault;
  }

  // Main entry point:
  // Receives the seven model outputs + processing vault unified signal
  // Returns a bio context signal that adjusts each model's final output
  process(input, modelOutputs, unifiedSignal, retrievedPriors) {
    const tokens = tokenize(input);
    const scores = {};
    for (const [k, v] of Object.entries(modelOutputs)) scores[k] = v.score || 0;

    // 1. Classify this input as a semantic cell type
    const cellType = this.vault.registry.classify(
      input,
      unifiedSignal.dominantModel,
      tokens,
      scores
    );

    // 2. Assign cortical depth from avg score + divergence
    // High divergence = shallow (surface processing, not yet integrated)
    // High avg score = deep (fully processed, ready to output)
    const rawDepth = clampN(
      unifiedSignal.avgScore * 0.6 +
      (1 - unifiedSignal.divergence) * 0.4
    );
    const corticalLayer = assignLayer(rawDepth);

    // 3. Classify dendrite topology from prior resonance
    const dendriteType = classifyDendriteType(retrievedPriors.length, 8);

    // 4. Build inhibitory/excitatory balance signal
    const inhibitory = this.vault.registry.inhibitory();
    const excitatory = this.vault.registry.excitatory();
    const inhibRatio = (inhibitory.length + excitatory.length) > 0
      ? roundN(inhibitory.length / (inhibitory.length + excitatory.length))
      : 0.5;
    // Balance: if too inhibitory (>0.6), boost excitatory models
    // If too excitatory (<0.4), boost inhibitory models
    const balanceSignal = inhibRatio > 0.6 ? "boost_excitatory" :
                          inhibRatio < 0.4 ? "boost_inhibitory" : "balanced";

    // 5. Build per-model feedback adjustments
    // Based on cortical layer role + cell type role + balance signal
    const modelAdjustments = {};
    for (const [modelId, output] of Object.entries(modelOutputs)) {
      let adjustment = 0;

      // Excitatory layer boosts excitatory models
      if (corticalLayer.excitatory && ["conceptual","affective","collocative","thematic"].includes(modelId)) {
        adjustment += 0.05;
      }
      // Inhibitory layer boosts inhibitory models (social, reflected)
      if (!corticalLayer.excitatory && ["social","reflected"].includes(modelId)) {
        adjustment += 0.05;
      }
      // Balance correction
      if (balanceSignal === "boost_excitatory" && ["conceptual","affective","thematic"].includes(modelId)) {
        adjustment += 0.03;
      }
      if (balanceSignal === "boost_inhibitory" && ["social","reflected"].includes(modelId)) {
        adjustment += 0.03;
      }
      // Spiny dendrites (highly connected) get a small boost across all models
      if (dendriteType === "spiny") adjustment += 0.02;

      modelAdjustments[modelId] = roundN(clampN((output.score || 0) + adjustment));
    }

    // 6. Build bio context signal
    const bioSignal = {
      id: uid(),
      input,
      processedAt: nowISO(),
      cellType: cellType.id,
      cellRole: cellType.role,
      corticalLayer: corticalLayer.id,
      corticalLayerName: corticalLayer.name,
      corticalDepth: roundN(rawDepth),
      dendriteType,
      inhibRatio,
      balanceSignal,
      modelAdjustments,
      bioContextSummary: [
        `Cell type: ${cellType.id} (${cellType.role}, seen ${cellType.count}x).`,
        `Cortical layer: ${corticalLayer.id} ${corticalLayer.name} — ${corticalLayer.role}.`,
        `Dendrite: ${dendriteType}. Balance: ${balanceSignal} (inhib ratio: ${inhibRatio}).`,
        `Depth: ${roundN(rawDepth)}. Adjustments applied to ${Object.keys(modelAdjustments).length} models.`
      ].join(" ")
    };

    // 7. Store in bio vault
    this.vault.store(bioSignal);

    return bioSignal;
  }
}
