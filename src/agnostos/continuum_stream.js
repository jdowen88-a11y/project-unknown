/**
 * Agnostos continuum_stream.js — ESM merge copy
 * Classical forward stream for the isolated Agnostos origin module.
 */

import { EventEmitter } from 'node:events';

export class ContinuumStream extends EventEmitter {
  constructor() {
    super();
    this.state = {};
    this.history = [];
    this._sparked = false;
    this._emergence = null;
  }

  feed(data) {
    const entry = { data, timestamp: Date.now() };
    this.history.push(entry);
    this.state = { ...this.state, ...data };
    this.emit('flow', entry);
    return this;
  }

  receiveEmergence(emergence) {
    if (this._sparked) return;
    this._sparked = true;
    this._emergence = emergence;
    this.emit(emergence ? 'emergence' : 'void', emergence || undefined);
  }

  getEmergence() {
    return this._emergence;
  }

  hasEmergence() {
    return this._sparked && this._emergence !== null;
  }
}

export default ContinuumStream;
