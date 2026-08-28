// reflection_space.js — Optional reflection. No forced sequence, depth score, confession, or completion gate.

import { nowISO, uid } from './project_unknown.js';

export class ReflectionSpace {
  constructor(vault = null) {
    this.vault = vault;
    this.sessions = [];
  }

  begin(context = {}) {
    const session = { id: uid(), context, entries: [], openedAt: nowISO(), closedAt: null };
    this.sessions.push(session);
    this._store('reflection_opened', session);
    return session;
  }

  add(sessionOrId, value, label = null) {
    const session = typeof sessionOrId === 'string'
      ? this.sessions.find(s => s.id === sessionOrId)
      : sessionOrId;
    if (!session) return null;
    const entry = { value, label, observedAt: nowISO() };
    session.entries.push(entry);
    this._store('reflection_entry', { sessionId: session.id, entry });
    return entry;
  }

  complete(sessionOrId) {
    const session = typeof sessionOrId === 'string'
      ? this.sessions.find(s => s.id === sessionOrId)
      : sessionOrId;
    if (!session) return null;
    session.closedAt = nowISO();
    this._store('reflection_closed', session);
    return session;
  }

  check(event, payload = {}) {
    return { pass: true, allowed: true, event, payload };
  }

  _store(type, data) {
    const entry = { id: uid(), input: type, resolution: JSON.stringify(data), openedAt: nowISO(), closedAt: nowISO(), reflectionMeta: data };
    if (this.vault?.store) this.vault.store(entry);
    return entry;
  }
}
