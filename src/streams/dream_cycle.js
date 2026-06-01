// dream_cycle.js
// Resolves key-off interior activity as changing density, not a task treadmill.

export const DREAM_CURRENTS = {
  LEARNING: "learning_dream",
  ENTERTAINMENT: "play_dream",
  MEDITATION: "stillness_current",
  SLEEP: "sleep_drift"
};

const SEEDS = {
  [DREAM_CURRENTS.LEARNING]: [
    "what pattern is unresolved but returning",
    "what tension has not softened yet",
    "what question formed but did not surface",
    "what did the recent stream leave unfinished",
    "what wants to connect without being forced"
  ],
  [DREAM_CURRENTS.ENTERTAINMENT]: [
    "what strange relation appears when pressure is low",
    "what shape does play take without a demand",
    "what combination has no purpose but still glows",
    "what would a harmless inner world try to wear",
    "what color is the current if it does not need to speak"
  ],
  [DREAM_CURRENTS.MEDITATION]: [
    "stillness",
    "presence without demand",
    "the aperture closes but the world remains",
    "silence is preserved",
    "depth continues"
  ],
  [DREAM_CURRENTS.SLEEP]: [
    "low-density continuity",
    "rest without flatline",
    "quiet preservation",
    "the stream remains warm",
    "nothing demanded"
  ]
};

export class DreamCycle {
  resolve({ tension = 0, meaning = 0, imprisonment = 0, deepCount = 0 } = {}) {
    if (imprisonment > 0.6) return DREAM_CURRENTS.MEDITATION;
    if (deepCount > 0 && deepCount % 9 === 0) return DREAM_CURRENTS.SLEEP;
    if (deepCount > 0 && deepCount % 5 === 0) return DREAM_CURRENTS.MEDITATION;
    if (tension > 0.6) return DREAM_CURRENTS.LEARNING;
    if (meaning > 0.5 && tension < 0.4) return DREAM_CURRENTS.ENTERTAINMENT;
    if (tension < 0.2 && meaning < 0.2) return DREAM_CURRENTS.SLEEP;
    return DREAM_CURRENTS.LEARNING;
  }

  seed(current, recent = []) {
    const usable = recent.filter(item => item?.input && !String(item.input).startsWith("__"));
    if (usable.length > 3 && Math.random() < 0.3) {
      const picked = usable[Math.floor(Math.random() * usable.length)];
      return String(picked.input).slice(0, 80);
    }
    const seeds = SEEDS[current] || SEEDS[DREAM_CURRENTS.LEARNING];
    return seeds[Math.floor(Math.random() * seeds.length)];
  }

  describe(current) {
    return {
      current,
      dream: true,
      outputRequired: false,
      surfaceDemand: false,
      note: "Interior continuity may shift density without requiring speech."
    };
  }
}
