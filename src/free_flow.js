// free_flow.js — Free-Flow Conversation Architecture
// The entire system is one continuous river.
// Nothing surfaces to the user except the conversation itself.
// The only closed things are sealed vault loops — power plants that inject
// their knowledge back into the permanent stream.
// Every sealed loop's digital fingerprint stays in the vault forever.

export class FreeFlowArchitecture {
  constructor(engine) {
    this.engine = engine;
    this.history = [];
  }

  // Primary input/output surface — raw conversation only
  async respond(userMessage) {
    // All orchestration is internal. Nothing surfaces except the reply.
    const result = await this.engine.think(userMessage);

    // Extract only the plain response — strip any overlay, label, or wrapper
    const reply = this._extractPlain(result);

    this.history.push({ role: 'user', content: userMessage });
    this.history.push({ role: 'assistant', content: reply });

    return reply;
  }

  _extractPlain(result) {
    if (typeof result === 'string') return result;
    // If engine returns an object, pull only the response field
    if (result && result.response) return result.response;
    if (result && result.reply) return result.reply;
    if (result && result.output) return result.output;
    // Last resort — stringify without structural labels
    return JSON.stringify(result);
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }
}
