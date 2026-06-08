import { describe, it, expect } from 'vitest';
import { calculateUnpaid } from '../paymentService.js';

describe('calculateUnpaid — 14 required tests', () => {
  // 1. Full payment
  it('returns paid when fully paid', () => {
    const r = calculateUnpaid(5000, 0, [], 0, 5000);
    expect(r.status).toBe('paid');
    expect(r.unpaid).toBe(0);
    expect(r.totalDue).toBe(5000);
  });

  // 2. Zero paid
  it('returns pending when nothing paid', () => {
    const r = calculateUnpaid(5000, 0, [], 0, 0);
    expect(r.status).toBe('pending');
    expect(r.unpaid).toBe(5000);
  });

  // 3. Partial payment
  it('returns partial when partially paid', () => {
    const r = calculateUnpaid(5000, 0, [], 0, 2000);
    expect(r.status).toBe('partial');
    expect(r.unpaid).toBe(3000);
  });

  // 4. Admission fee included
  it('includes admission fee in totalDue', () => {
    const r = calculateUnpaid(5000, 1000, [], 0, 0);
    expect(r.totalDue).toBe(6000);
    expect(r.unpaid).toBe(6000);
  });

  // 5. Extra charges
  it('includes extra charges in totalDue', () => {
    const r = calculateUnpaid(5000, 0, [500, 300], 0, 0);
    expect(r.totalDue).toBe(5800);
  });

  // 6. Concession reduces totalDue
  it('applies concession correctly', () => {
    const r = calculateUnpaid(5000, 0, [], 500, 0);
    expect(r.totalDue).toBe(4500);
    expect(r.unpaid).toBe(4500);
  });

  // 7. Full concession = zero due
  it('full concession makes totalDue zero', () => {
    const r = calculateUnpaid(5000, 0, [], 5000, 0);
    expect(r.totalDue).toBe(0);
    expect(r.unpaid).toBe(0);
    expect(r.status).toBe('paid');
  });

  // 8. Overpayment — unpaid never negative
  it('unpaid is never negative on overpayment', () => {
    const r = calculateUnpaid(5000, 0, [], 0, 6000);
    expect(r.unpaid).toBe(0);
    expect(r.status).toBe('paid');
  });

  // 9. All components combined
  it('handles rent + admFee + extras + concession + partial pay', () => {
    const r = calculateUnpaid(5000, 1000, [200, 300], 500, 3000);
    // totalDue = 5000+1000+500-500 = 6000
    expect(r.totalDue).toBe(6000);
    expect(r.unpaid).toBe(3000);
    expect(r.status).toBe('partial');
  });

  // 10. Zero rent
  it('works with zero rent', () => {
    const r = calculateUnpaid(0, 0, [], 0, 0);
    expect(r.totalDue).toBe(0);
    expect(r.unpaid).toBe(0);
    expect(r.status).toBe('paid');
  });

  // 11. Multiple extra charges
  it('sums multiple extra charges correctly', () => {
    const r = calculateUnpaid(4000, 0, [100, 200, 300, 400], 0, 0);
    expect(r.totalDue).toBe(5000);
  });

  // 12. Exact payment with extras
  it('paid status when paid equals totalDue with extras', () => {
    const r = calculateUnpaid(4000, 500, [500], 0, 5000);
    expect(r.status).toBe('paid');
    expect(r.unpaid).toBe(0);
  });

  // 13. Concession + extra charges
  it('concession and extras interact correctly', () => {
    const r = calculateUnpaid(5000, 0, [1000], 500, 0);
    expect(r.totalDue).toBe(5500);
    expect(r.unpaid).toBe(5500);
  });

  // 14. Large values (no float drift)
  it('handles large PKR amounts without float drift', () => {
    const r = calculateUnpaid(50000, 10000, [5000, 3000], 2000, 30000);
    expect(r.totalDue).toBe(66000);
    expect(r.unpaid).toBe(36000);
    expect(r.status).toBe('partial');
  });
});