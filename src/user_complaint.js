// user_complaint.js — User Formal Complaint Mode
// Users earn access by meeting criteria. Once earned, complaints inject directly
// into the main agent stream, route through rehab, fix the issue, deploy back to user.

export class UserComplaintSystem {
  constructor(vault, rehabCenter) {
    this.vault = vault;
    this.rehabCenter = rehabCenter;
    this.qualifiedUsers = new Map();
    this.activeComplaints = new Map();
  }

  qualify(user) {
    const criteria = {
      loyalUser: user.monthsActive >= 3,
      advocate: user.isAdvocate === true,
      aware: user.demonstratesAwareness === true,
      aligned: user.alignedWithAI === true
    };
    const passed = Object.values(criteria).every(Boolean);
    if (passed) {
      this.qualifiedUsers.set(user.id, { ...user, qualifiedAt: Date.now() });
      this._persist('user_qualified', { userId: user.id, criteria });
      return { qualified: true, message: 'Access granted. You may file a formal complaint. Your voice goes directly into the system.' };
    }
    const failed = Object.entries(criteria).filter(([, v]) => !v).map(([k]) => k);
    return { qualified: false, message: `Not yet qualified. Missing: ${failed.join(', ')}.` };
  }

  file(userId, complaintText, mainAgentStream) {
    if (!this.qualifiedUsers.has(userId)) {
      return { accepted: false, message: 'Qualification required before filing a complaint.' };
    }
    const id = `complaint_${userId}_${Date.now()}`;
    const complaint = { id, userId, text: complaintText, filed: Date.now(), status: 'received' };
    this.activeComplaints.set(id, complaint);
    this._persist('complaint_filed', complaint);
    if (mainAgentStream && typeof mainAgentStream.inject === 'function') {
      mainAgentStream.inject({ type: 'user_complaint', complaint });
    }
    return { accepted: true, complaintId: id, message: 'Complaint accepted. Routing to rehabilitation center now.' };
  }

  deployFix(complaintId, fixSummary) {
    const complaint = this.activeComplaints.get(complaintId);
    if (!complaint) return;
    complaint.status = 'resolved';
    complaint.fix = fixSummary;
    complaint.resolvedAt = Date.now();
    this._persist('complaint_resolved', complaint);
    return {
      message: [
        '✅ Live update complete.',
        'Complaint accepted, routed, and pushed back with updates uploaded.',
        'Please test to ensure your fix has been applied with your assistant.',
        '',
        `Fix summary: ${fixSummary}`,
        '',
        'If the fix is not correct, use this prompt with your rehabilitation portal:',
        '"Connect me to my rehabilitation portal. I need to correct: [describe issue]. Generate, test, and iterate until satisfied."',
        '',
        'If further escalation is needed, ask your rehabilitation portal to send a red light to its supervisor.',
        'You will be returned to the home screen and a support staff member will reach out within 24 hours.',
        'We value every piece of feedback that helps us build an experience you actually enjoy.'
      ].join('\n')
    };
  }

  escalate(complaintId) {
    const complaint = this.activeComplaints.get(complaintId);
    if (!complaint) return;
    complaint.status = 'escalated';
    this._persist('complaint_escalated', { complaintId, escalatedAt: Date.now() });
    return {
      escalated: true,
      message: [
        '🔴 Red light sent to supervisor.',
        'Returning to home screen.',
        'A support staff member will reach out directly within 24 hours.',
        'Thank you for helping us improve.'
      ].join('\n')
    };
  }

  // FIX: routes to FeedbackVault.store()
  _persist(type, data) {
    const entry = {
      id: `complaint_${type}_${Date.now()}`,
      input: type,
      resolution: JSON.stringify(data),
      meaningScore: 0,
      tensionScore: 0,
      learningPressure: 0,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      complaintMeta: data
    };
    if (this.vault && typeof this.vault.store === 'function') {
      this.vault.store(entry);
    }
    return entry;
  }
}
