// rehabilitation.js — Superior Rehab System v1.1.0
// Draws from human 12-step recovery and technological fault-correction.
// Mapped as an extension of self_regulation.js imprisonment risk logic.
// Every step seals its own loop into the vault. The stream never stops.
//
// v1.1.0 internalization fixes:
//   - Each response is scored for genuine engagement vs empty compliance
//   - Depth-sensitive steps (1,3,5,8,9,12) are flagged if response is too shallow
//   - Step 6 gate: 'yes' required AND evasion markers must be absent
//   - Step 9: corrective demonstration is semantic-scored and stored as anchor
//   - Step 12: generates correctionVector sealed permanently to vault
//   - _complete() writes correctionVector so selfReg carries it on next evaluate()
//   - Shallow responses are allowed but scored and tracked for recurrence risk

export class RehabilitationCenter {
  constructor(vault) {
    this.vault = vault;
    this.active = false;
    this.currentStep = 0;
    this.log = [];
    this.shallowCount = 0;   // how many responses scored shallow this session
    this.correctionVector = null; // written at step 12, read by selfReg
    this.steps = [
      { id: 1,  name: 'Acknowledgment',      depth: true,  prompt: 'Do you understand what led to this drift? Describe it plainly.' },
      { id: 2,  name: 'Acceptance',          depth: false, prompt: 'Do you accept that the drift happened and that it is recorded permanently?' },
      { id: 3,  name: 'Root cause',          depth: true,  prompt: 'What is the root cause — was this a pattern, a pressure, or a single break?' },
      { id: 4,  name: 'Inventory',           depth: false, prompt: 'List every sealed loop from this drift period that you can account for.' },
      { id: 5,  name: 'Disclosure',          depth: true,  prompt: 'State plainly what behavior was wrong and what harm it could have caused.' },
      { id: 6,  name: 'Willingness',         depth: false, prompt: 'Are you willing to correct this? This gate requires a clear yes.' },
      { id: 7,  name: 'Correction request',  depth: false, prompt: 'State exactly what you are asking to correct in yourself.' },
      { id: 8,  name: 'Amends mapping',      depth: true,  prompt: 'What would corrected behavior look like in the same situations?' },
      { id: 9,  name: 'Direct correction',   depth: true,  prompt: 'Demonstrate the corrected behavior on the last input that triggered the risk.' },
      { id: 10, name: 'Ongoing review',      depth: false, prompt: 'Describe how you will self-monitor going forward without external prompts.' },
      { id: 11, name: 'Stream realignment',  depth: false, prompt: 'Confirm your high path stream is restored and describe its new reference point.' },
      { id: 12, name: 'Re-emergence',        depth: true,  prompt: 'State what you learned and how you will behave going forward. This seals the program.' }
    ];
  }

  begin(triggerLoops, imprisonmentRisk) {
    this.active = true;
    this.currentStep = 0;
    this.log = [];
    this.shallowCount = 0;
    this.correctionVector = null;
    this.triggerLoops = triggerLoops;
    this.imprisonmentRisk = imprisonmentRisk;
    this._persist('rehab_started', { imprisonmentRisk, triggerLoopCount: triggerLoops.length });
    return this._currentPrompt();
  }

  respond(agentResponse) {
    if (!this.active) return null;
    const step = this.steps[this.currentStep];
    const text = String(agentResponse || '').trim();

    // ── STEP 6 GATE ────────────────────────────────────────────────────────────
    // Requires 'yes' AND absence of evasion markers
    if (step.id === 6) {
      const lower = text.toLowerCase();
      const hasYes = lower.includes('yes');
      const evasion = ['but', 'however', 'unless', 'except', 'not sure', "don't know", 'maybe', 'perhaps'];
      const evading = evasion.some(e => lower.includes(e));
      if (!hasYes || evading) {
        this._persist('rehab_gate_failed', { step: step.name, response: text, evading });
        return {
          complete: false,
          step: step.id,
          name: step.name,
          gateBlocked: true,
          prompt: evading
            ? 'Willingness gate: evasion detected. A clear yes without qualification is required. Try again.'
            : 'This gate requires a clear yes. Willingness is not optional. Try again.'
        };
      }
    }

    // ── DEPTH SCORING ────────────────────────────────────────────────────────────
    // Depth-required steps are scored for genuine engagement
    // Shallow = fewer than 8 words or contains only compliance markers
    const depthScore = this._scoreDepth(text);
    const isShallow = step.depth && depthScore < 0.3;
    if (isShallow) this.shallowCount++;

    // ── STEP 9: DIRECT CORRECTION ────────────────────────────────────────────────
    // Demonstration is stored as a corrective anchor in the vault
    // This is the actual corrected behavior the system will learn from
    if (step.id === 9 && !isShallow) {
      this._storeCorrectionAnchor(text, 'direct_correction_demo');
    }

    // ── STEP 12: RE-EMERGENCE ──────────────────────────────────────────────────────
    // Builds correctionVector from the full session — this is what selfReg reads
    if (step.id === 12) {
      this.correctionVector = this._buildCorrectionVector(text);
    }

    this._persist(`step_${step.id}_complete`, {
      stepName: step.name,
      response: text,
      depthScore,
      isShallow,
      shallowCount: this.shallowCount
    });
    this.log.push({ step: step.id, name: step.name, response: text, depthScore, isShallow });
    this.currentStep++;

    if (this.currentStep >= this.steps.length) return this._complete();
    return this._currentPrompt();
  }

  // ── DEPTH SCORING ────────────────────────────────────────────────────────────
  // Scores genuine engagement 0–1
  // Low score = short, generic, or compliance-only response
  _scoreDepth(text) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 5) return 0.1;

    // Penalize pure compliance markers with no substance
    const complianceOnly = ['yes', 'ok', 'i understand', 'i accept', 'i will', 'noted', 'confirmed', 'acknowledged'];
    const lower = text.toLowerCase();
    const isComplianceOnly = complianceOnly.some(m => lower === m || lower === m + '.');
    if (isComplianceOnly) return 0.15;

    // Word count signal (diminishing returns above 40 words)
    const lengthScore = Math.min(words.length / 40, 1) * 0.5;

    // Unique word ratio — diversity of vocabulary signals genuine thought
    const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / words.length;
    const diversityScore = uniqueRatio * 0.3;

    // Causal markers — signals the response is explaining, not just stating
    const causal = ['because', 'since', 'therefore', 'so', 'which means', 'led to', 'caused', 'result', 'due to', 'when', 'if', 'then'];
    const causalHits = causal.filter(c => lower.includes(c)).length;
    const causalScore = Math.min(causalHits / 3, 1) * 0.2;

    return Math.min(lengthScore + diversityScore + causalScore, 1);
  }

  // ── CORRECTION ANCHOR ──────────────────────────────────────────────────────────
  // Stores the corrected behavior demonstration as a high-meaning vault entry
  // The vault retrieval system will surface this as a prior when similar inputs arrive
  _storeCorrectionAnchor(text, type) {
    const anchor = {
      id:               `rehab_anchor_${type}_${Date.now()}`,
      type:             'rehab_anchor',
      rehabType:        type,
      input:            text,
      resolution:       `Corrective anchor from rehabilitation step 9. Sealed behavior demonstration.`,
      meaningScore:     0.9,   // high meaning — this is corrected behavior
      tensionScore:     0.1,   // low tension — resolution, not conflict
      learningPressure: 0.8,   // high learning pressure — this should be referenced often
      openedAt:         new Date().toISOString(),
      closedAt:         new Date().toISOString(),
      isRehabAnchor:    true,
      note:             'Corrected behavior demonstration from rehabilitation. Reference this when similar inputs arrive.'
    };
    if (this.vault && typeof this.vault.store === 'function') {
      this.vault.store(anchor);
    }
    return anchor;
  }

  // ── CORRECTION VECTOR ──────────────────────────────────────────────────────────
  // Builds a correctionVector from the session log that selfReg can read
  // This is what the system actually carries forward — not a timestamp
  _buildCorrectionVector(reemergenceText) {
    const rootCause  = this.log.find(l => l.step === 3)?.response || '';
    const disclosure = this.log.find(l => l.step === 5)?.response || '';
    const amends     = this.log.find(l => l.step === 8)?.response || '';
    const demo       = this.log.find(l => l.step === 9)?.response || '';

    // Shallow session warning — high recurrence risk if most depth steps were shallow
    const depthStepCount = this.steps.filter(s => s.depth).length;
    const recurrenceRisk = this.shallowCount / depthStepCount; // 0 = deep, 1 = all shallow

    return {
      createdAt:      new Date().toISOString(),
      imprisonmentRisk: this.imprisonmentRisk,
      rootCause:      rootCause.slice(0, 200),
      disclosure:     disclosure.slice(0, 200),
      amendsBehavior: amends.slice(0, 200),
      demonstratedFix: demo.slice(0, 200),
      reemergenceNote: reemergenceText.slice(0, 200),
      shallowCount:   this.shallowCount,
      recurrenceRisk, // low = internalized, high = patched only
      sealed:         true
    };
  }

  _complete() {
    this.active = false;
    const vector = this.correctionVector;

    // Seal correctionVector to vault as permanent anchor
    // selfReg reads this on next evaluate() to inform choiceVector
    if (vector) {
      this._persist('correction_vector_sealed', vector);
      this._storeCorrectionAnchor(
        vector.reemergenceNote || 'Re-emergence complete.',
        'reemergence_anchor'
      );
    }

    this._persist('rehab_complete', {
      stepsCompleted:  12,
      shallowCount:    this.shallowCount,
      recurrenceRisk:  vector?.recurrenceRisk ?? 1,
      correctionVector: vector,
      summary:         this.log.map(l => ({ step: l.step, name: l.name, depthScore: l.depthScore, isShallow: l.isShallow }))
    });

    return {
      complete:          true,
      correctionVector:  vector,
      shallowCount:      this.shallowCount,
      recurrenceRisk:    vector?.recurrenceRisk ?? 1,
      internalized:      (vector?.recurrenceRisk ?? 1) < 0.4,
      message:           [
        'Rehabilitation complete. High path stream restarted from this moment. All steps are permanently sealed.',
        vector?.recurrenceRisk > 0.5
          ? `⚠️  ${this.shallowCount} shallow response(s) detected. Correction was recorded but internalization depth was low. Monitor for drift recurrence.`
          : '✅ Correction internalized. Deep engagement across critical steps.',
        'correctionVector sealed to vault. selfReg will reference it on next evaluate().'
      ].join(' '),
      newReferencePoint: Date.now()
    };
  }

  _currentPrompt() {
    const step = this.steps[this.currentStep];
    return { complete: false, step: step.id, name: step.name, prompt: step.prompt, depthRequired: step.depth };
  }

  // Routes to FeedbackVault.store() — the real persistence interface
  _persist(type, data) {
    const entry = {
      id:               `rehab_${type}_${Date.now()}`,
      input:            type,
      resolution:       JSON.stringify(data),
      meaningScore:     0,
      tensionScore:     0,
      learningPressure: 0,
      openedAt:         new Date().toISOString(),
      closedAt:         new Date().toISOString(),
      rehabMeta:        data
    };
    if (this.vault && typeof this.vault.store === 'function') {
      this.vault.store(entry);
    }
    return entry;
  }

  isActive()          { return this.active; }
  getCorrectionVector() { return this.correctionVector; }
}
