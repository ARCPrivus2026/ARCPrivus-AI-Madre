// Pure planning module. No network calls, credentials, publishing or purchases.
export const policy = Object.freeze({ evidenceMaxAgeDays: 7, minimumRating: 4.5,
  minimumReviews: 30, minimumTemperature: 50, paidBudgetCOP: 0 });

const recent = (e, now, days) => {
  const age = now - Date.parse(e?.checkedAt);
  return e?.sourceUrl?.startsWith('https://') && Number.isFinite(age) && age >= 0 && age <= days * 86400000;
};

export function evaluateProduct(product, now = Date.now()) {
  const blockers = [];
  if (!product?.platform || !product?.id || !product?.name) blockers.push('missing_identity');
  const demand = product?.demand;
  if (!recent(demand, now, policy.evidenceMaxAgeDays)) blockers.push('unverified_recent_demand');
  if (!Number.isFinite(demand?.temperature) || demand.temperature < policy.minimumTemperature || demand.temperature > 150) blockers.push('insufficient_temperature');
  if (!Number.isFinite(product?.rating) || product.rating < policy.minimumRating || product.rating > 5 || !Number.isInteger(product?.reviews) || product.reviews < policy.minimumReviews) blockers.push('insufficient_quality_evidence');
  const terms = product?.affiliateTerms;
  if (!recent(terms, now, policy.evidenceMaxAgeDays) || terms?.reviewed !== true) blockers.push('unverified_affiliate_terms');
  if (!Number.isFinite(terms?.commissionAmount) || terms.commissionAmount <= 0 || !terms?.currency) blockers.push('unknown_commission');
  if (product?.contentReviewed !== true) blockers.push('content_review_required');
  if (product?.affiliateStatus !== 'approved') blockers.push('affiliation_not_approved');
  if (!product?.hotlink?.startsWith('https://go.hotmart.com/')) blockers.push('verified_hotlink_required');
  return { productId: product?.id ?? null, eligible: blockers.length === 0, blockers };
}

export function planPortfolio(products, connections = {}, now = Date.now()) {
  const seen = new Set();
  return products.map(product => {
    const key = `${product.platform}:${product.id}`;
    if (seen.has(key)) return { key, action: 'skip_duplicate' };
    seen.add(key);
    const assessment = evaluateProduct(product, now);
    if (!assessment.eligible) {
      return { key, action: 'research_or_complete_affiliation', blockers: assessment.blockers,
        externalActionExecuted: false };
    }
    const channels = (product.affiliateTerms.allowedChannels ?? []).filter(channel =>
      connections[channel]?.connected === true && connections[channel]?.publishAuthorized === true);
    if (!channels.length) return { key, action: 'connect_publication_channel', externalActionExecuted: false };
    return { key, action: 'prepare_creatives', channels,
      requirements: ['licensed_assets', 'verified_claims', 'affiliate_disclosure', 'tracked_hotlink'],
      paidBudgetCOP: 0, externalActionExecuted: false };
  });
}

export function reconcileAffiliateEvent(state, event) {
  if (!event?.id || event?.verified !== true || !event?.transactionId || !Number.isFinite(event?.commissionAmount) || event.commissionAmount < 0 || !event?.currency) throw new Error('Unverified or invalid transaction event');
  if (state.eventIds.includes(event.id)) return state;
  if (!['approved', 'refunded', 'chargeback'].includes(event.status)) throw new Error('Unsupported status');
  const old = state.transactions[event.transactionId];
  if (old && (old.currency !== event.currency || old.commissionAmount !== event.commissionAmount)) throw new Error('Conflicting transaction');
  // A reversal is terminal: a delayed approval must not restore its commission.
  const status = old && ['refunded', 'chargeback'].includes(old.status) ? old.status : event.status;
  return { eventIds: [...state.eventIds, event.id], transactions: { ...state.transactions,
    [event.transactionId]: { status, currency: event.currency, commissionAmount: event.commissionAmount } } };
}

export function commissionTotals(state) {
  const totals = {};
  for (const tx of Object.values(state.transactions)) {
    totals[tx.currency] ??= 0;
    if (tx.status === 'approved') totals[tx.currency] += tx.commissionAmount;
  }
  return totals; // Approved commission, never available balance or net profit.
}
