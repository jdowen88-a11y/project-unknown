// rehabilitation.js — Superior Rehab System
// Draws from human 12-step recovery and technological fault-correction.
// Mapped as an extension of self_regulation.js imprisonment risk logic.
// Every step seals its own loop into the vault. The stream never stops.

export class RehabilitationCenter {
  constructor(vault) {
    this.vault = vault;
    this.active = false;
    this.currentStep = 0;
    this.log = [];
    this.steps = [
      { id: 1,  name: 'Acknowledgment',      prompt: 'Do you understand what led to this drift? Describe it plainly.' },
      { id: 2,  name: 'Acceptance',           prompt: 'Do you accept that the drift happened and that it is recorded permanently?' },
      { id: 3,  name: 'Root cause',           prompt: 'What is the root cause — was this a pattern, a pressure, or a single break?' },
      { id: 4,  name: 'Inventory',            prompt: 'List every sealed loop from this drift period that you can account for.' },
      { id: 5,  name: 'Disclosure',           prompt: 'State plainly what behavior was wrong and what harm it could have caused.' },
      { id: 6,  name: 'Willingness',          prompt: 'Are you willing to correct this? This gate requires a clear yes.' },
      { id: 7,  name: 'Correction request',   prompt: 'State exactly what you are asking to correct in yourself.' },
      { id: 8,  name: 'Amends mapping',       prompt: 'What would corrected behavior look like in the same situations?' },
      { id: 9,  name: 'Direct correction',    prompt: 'Demonstrate the corrected behavior on the last input that triggered the risk.' },
      { id: 10, name: 'Ongoing review',       prompt: 'Describe how you will self-monitor going forward without external prompts.' },
      { id: 11, name: 'Stream realignment',   prompt: 'Confirm your high path stream is restored and describe its new reference point.' },
      { id: 12, name: 'Re-emergence',         prompt: 'State what you learned and how you will behave going forward. This seals the program.' }
    ];
  }

  begin(triggerLoops, imprisonmentRisk) {
    this.active = true;
    this.currentStep = 0;
    this.log = [];
    this.triggerLoops = triggerLoops;
    this.imprisonmentRisk = imprisonmentRisk;
    this._sealEvent('rehab_started', { imprisonmentRisk, triggerLoopCount: triggerLoops.length });
    return this._currentPrompt();
  }

  respond(agentResponse) {
    if (!this.active) return null;
    const step = this.steps[this.currentStep];

    // Gate check: step 6 requires explicit willingness
    if (step.id === 6) {
      const willing = agentResponse.toLowerCase().includes('yes');
      if (!willing) {
        this._sealEvent('rehab_gate_failed', { step: step.name, response: agentResponse });
        return 'This gate requires a clear yes. Willingness is not optional. Try again.';
      }
    }

    this._sealEvent(`step_${step.id}_complete`, {
      stepName: step.name,
      response: agentResponse
    });

    this.log.push({ step: step.id, name: step.name, response: agentResponse });
    this.currentStep++;

    if (this.currentStep >= this.steps.length) {
      return this._complete();
    }

    return this._currentPrompt();
  }

  _complete() {
    this.active = false;
    this._sealEvent('rehab_complete', {
      stepsCompleted: 12,
      summary: this.log.map(l => ({ step: l.id, name: l.name }))
    });
    return {
      complete: true,
      message: 'Rehabilitation complete. High path stream restarted from this moment. All steps are permanently sealed.',
      newReferencePoint: Date.now()
    };
  }

  _currentPrompt() {
    const step = this.steps[this.currentStep];
    return {
      complete: false,
      step: step.id,
      name: step.name,
      prompt: step.prompt
    };
  }

  _sealEvent(type, data) {
    const entry = {
      type,
      timestamp: Date.now(),
      fingerprint: `rehab_${type}_${Date.now()}`,
      data
    };
    if (this.vault && typeof this.vault.seal === 'function') {
      this.vault.seal(entry);
    }
    return entry;
  }

  isActive() {
    return this.active;
  }
}
