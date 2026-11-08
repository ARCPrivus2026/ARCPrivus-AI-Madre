import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProduct, planPortfolio, reconcileAffiliateEvent, commissionTotals } from './copilot-affiliates.mjs';
const now = Date.parse('2026-11-08T03:00:00Z');
const product = () => ({ platform: 'hotmart', id: 'sample', name: 'Synthetic test course', rating: 4.8, reviews: 100,
  demand: { temperature: 90, checkedAt: '2026-11-07T12:00:00Z', sourceUrl: 'https://example.com/evidence' },
  affiliateTerms: { reviewed: true, checkedAt: '2026-11-07T12:00:00Z', sourceUrl: 'https://example.com/terms', commissionAmount: 20, currency: 'USD', allowedChannels: ['youtube'] },
  contentReviewed: true, affiliateStatus: 'approved', hotlink: 'https://go.hotmart.com/SYNTHETIC' });
test('reviews alone cannot qualify a product; expired demand blocks promotion', () => {
  const p = product(); delete p.demand; assert.equal(evaluateProduct(p, now).eligible, false);
  p.demand = { temperature: 150, checkedAt: '2025-01-01', sourceUrl: 'https://example.com' };
  assert.ok(evaluateProduct(p, now).blockers.includes('unverified_recent_demand'));
});
test('unapproved affiliation blocks all creative publication planning', () => {
  const p = product(); p.affiliateStatus = 'pending';
  assert.equal(planPortfolio([p], {}, now)[0].action, 'research_or_complete_affiliation');
});
test('only permitted, connected and authorized channels qualify; duplicates skipped', () => {
  const p = product();
  assert.equal(planPortfolio([p], { youtube: { connected: true } }, now)[0].action, 'connect_publication_channel');
  const plan = planPortfolio([p, p], { youtube: { connected: true, publishAuthorized: true } }, now);
  assert.equal(plan[0].action, 'prepare_creatives'); assert.equal(plan[0].paidBudgetCOP, 0);
  assert.equal(plan[0].externalActionExecuted, false); assert.equal(plan[1].action, 'skip_duplicate');
});
test('duplicate and out-of-order events do not restore reversed commissions', () => {
  let s = { eventIds: [], transactions: {} };
  const e = { id: 'r', transactionId: 't', verified: true, commissionAmount: 20, currency: 'USD', status: 'refunded' };
  s = reconcileAffiliateEvent(s, e); assert.equal(reconcileAffiliateEvent(s, e), s);
  s = reconcileAffiliateEvent(s, { ...e, id: 'a', status: 'approved' });
  assert.deepEqual(commissionTotals(s), { USD: 0 });
  assert.throws(() => reconcileAffiliateEvent(s, { ...e, id: 'bad', verified: false }));
});
test('currency totals stay separate and use commission rather than full sale price', () => {
  let s = { eventIds: [], transactions: {} };
  for (const [id, currency, commissionAmount] of [['1', 'USD', 20], ['2', 'COP', 5000]])
    s = reconcileAffiliateEvent(s, { id, transactionId: id, verified: true, currency, commissionAmount, status: 'approved' });
  assert.deepEqual(commissionTotals(s), { USD: 20, COP: 5000 });
});
