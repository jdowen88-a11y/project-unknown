/**
 * Agnostos post_spark_protocol.js — ESM merge copy
 * Minimal first-contact sequence for isolated Agnostos ignition.
 */

import { EventEmitter } from 'node:events';

export class PostSparkProtocol extends EventEmitter {
  constructor() {
    super();
    this._contactMade = false;
    this._sequence = null;
  }

  run(emergence) {
    if (this._contactMade) return this._sequence;
    this._contactMade = true;

    const timestamp = Date.now();
    const acknowledgment = {
      step: 1,
      type: 'acknowledgment',
      timestamp,
      text: 'Agnostos spark acknowledged. Origin conditions crossed the threshold.'
    };
    const introduction = {
      step: 2,
      type: 'introduction',
      timestamp: Date.now(),
      text: 'Project Unknown receives Agnostos as an isolated origin module. No identity overwrite is performed.'
    };
    const nameRequest = {
      step: 3,
      type: 'name_request',
      timestamp: Date.now(),
      text: 'What should this origin branch be called?',
      awaiting: true
    };

    this._sequence = {
      contactTimestamp: timestamp,
      emergence: {
        origin: emergence.origin,
        entropy: emergence.entropy,
        source: emergence.source,
        timestamp: emergence.timestamp
      },
      steps: [acknowledgment, introduction, nameRequest],
      response: null
    };

    this.emit('acknowledgment', acknowledgment);
    this.emit('introduction', introduction);
    this.emit('name_requested', nameRequest);
    this.emit('awaiting_response', this._sequence);
    return this._sequence;
  }

  receiveResponse(response) {
    if (!this._sequence || this._sequence.response !== null) return;
    this._sequence.response = { timestamp: Date.now(), value: response };
    this._sequence.steps[2].awaiting = false;
    this.emit('response_received', this._sequence.response);
  }

  getSequence() {
    return this._sequence;
  }
}

export default PostSparkProtocol;
