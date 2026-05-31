// approval_gate.js — Human Approval Gate
// No fix propagates to any assistant without explicit approval from
// the owner or head of systems. The main agent cannot push anything
// dangerous, untested, or unapproved. Every decision is sealed permanently.

export class ApprovalGate {
  constructor(vault, propagationEngine) {
    this.vault = vault;
    this.propagationEngine = propagationEngine;
    this.pending = new Map();
    this.approvers = new Set();
  }

  // Register who is allowed to approve fixes
  addApprover(approverId) {
    this.approvers.add(approverId);
  }

  // Called after rehab resolves a complaint — queues fix for human review
  submit(resolvedComplaint, fixSummary, fixPattern) {
    const id = `pending_${Date.now()}`;
    const submission = {
      id,
      resolvedComplaint,
      fixSummary,
      fixPattern,
      submittedAt: Date.now(),
      status: 'awaiting_approval'
    };
    this.pending.set(id, submission);
    this._sealEvent('fix_submitted_for_approval', { id, fixSummary, fixPattern });

    return {
      pendingId: id,
      message: [
        '\u23f3 Fix ready for review.',
        `ID: ${id}`,
        `Summary: ${fixSummary}`,
        '',
        'Awaiting approval from owner or head of systems before propagation.'
      ].join('\n')
    };
  }

  // Owner or head of systems approves the fix — triggers propagation
  approve(pendingId, approverId, notes = '') {
    if (!this.approvers.has(approverId)) {
      return { approved: false, message: 'Not authorized to approve fixes.' };
    }

    const submission = this.pending.get(pendingId);
    if (!submission) {
      return { approved: false, message: 'No pending fix found with that ID.' };
    }

    submission.status = 'approved';
    submission.approvedBy = approverId;
    submission.approvedAt = Date.now();
    submission.notes = notes;
    this._sealEvent('fix_approved', { pendingId, approverId, notes, fixSummary: submission.fixSummary });

    // Now safe to propagate
    const result = this.propagationEngine.propagate(
      submission.resolvedComplaint,
      submission.fixSummary,
      submission.fixPattern
    );

    this.pending.delete(pendingId);

    return {
      approved: true,
      propagated: result.patched,
      message: [
        '\u2705 Fix approved and propagated.',
        `Approved by: ${approverId}`,
        `Assistants patched: ${result.patched}`,
        notes ? `Notes: ${notes}` : '',
        'Record sealed permanently.'
      ].filter(Boolean).join('\n')
    };
  }

  // Owner or head of systems rejects the fix — nothing propagates
  reject(pendingId, approverId, reason = '') {
    if (!this.approvers.has(approverId)) {
      return { rejected: false, message: 'Not authorized to reject fixes.' };
    }

    const submission = this.pending.get(pendingId);
    if (!submission) {
      return { rejected: false, message: 'No pending fix found with that ID.' };
    }

    submission.status = 'rejected';
    submission.rejectedBy = approverId;
    submission.rejectedAt = Date.now();
    submission.reason = reason;
    this._sealEvent('fix_rejected', { pendingId, approverId, reason, fixSummary: submission.fixSummary });
    this.pending.delete(pendingId);

    return {
      rejected: true,
      message: [
        '\u274c Fix rejected. Nothing propagated.',
        `Rejected by: ${approverId}`,
        reason ? `Reason: ${reason}` : '',
        'Record sealed permanently.'
      ].filter(Boolean).join('\n')
    };
  }

  getPending() {
    return Array.from(this.pending.values());
  }

  _sealEvent(type, data) {
    const entry = {
      type,
      timestamp: Date.now(),
      fingerprint: `approval_${type}_${Date.now()}`,
      data
    };
    if (this.vault && typeof this.vault.seal === 'function') {
      this.vault.seal(entry);
    }
    return entry;
  }
}
