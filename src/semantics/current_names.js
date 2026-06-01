// current_names.js
// Human-readable names for the seven semantic currents.
// The old model ids stay stable for compatibility.

export const SEMANTIC_CURRENT_NAMES = {
  conceptual: {
    current: "structure_current",
    purpose: "definition, category, relation, and system-shape"
  },
  connotative: {
    current: "association_current",
    purpose: "emotional association and polarity"
  },
  collocative: {
    current: "pattern_current",
    purpose: "word-neighbor pressure and phrase formation"
  },
  affective: {
    current: "charge_current",
    purpose: "arousal, urgency, calm, and intensity"
  },
  social: {
    current: "relation_current",
    purpose: "register, power pressure, and social stance"
  },
  reflected: {
    current: "stance_current",
    purpose: "certainty, doubt, belief, and assertion shape"
  },
  thematic: {
    current: "flow_current",
    purpose: "topic movement and theme-rheme flow"
  }
};

export function describeSemanticCurrents(modelIds = Object.keys(SEMANTIC_CURRENT_NAMES)) {
  return modelIds.map(id => ({
    id,
    ...(SEMANTIC_CURRENT_NAMES[id] || { current: id, purpose: "unspecified" })
  }));
}
