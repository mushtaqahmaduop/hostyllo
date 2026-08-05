/*
 * Job ID construction. Pure — no Redis, no queue instances, so it can be unit-tested directly.
 * `lib/queues.ts` re-exports everything here; import from there when you already need a queue.
 *
 * BullMQ's rule for custom job IDs is a trap, which is why this lives in one place.
 *
 * `Job.addJob` rejects a custom ID containing ':' UNLESS it splits into exactly three parts — a
 * compatibility carve-out for old repeatable jobs, not a guarantee (bullmq 5.78,
 * classes/job.js:1041-1050, whose own comment says the next breaking change makes it a flat
 * `includes(':')`). Under that rule `rent:<hostelId>:<month>` passed and `auto-cancel:<day>` threw
 * "Custom Id cannot contain :" — so the nightly sweep failed on its very first tick while rent
 * looked fine. Proven on staging 2026-08-06, not reasoned about.
 *
 * A convention that depends on how many colons a template happens to produce is not one anyone can
 * hold in their head, so '-' is the separator everywhere and `jobId()` is the only place that
 * decides. It throws rather than sanitising: a caller that wants a colon has misunderstood, and
 * silently rewriting its ID would break the idempotency the ID exists to provide.
 */

export function jobId(...parts: string[]): string {
  const id = parts.join('-');
  if (id.includes(':')) {
    throw new Error(`job ID must not contain ':' (BullMQ rejects it) — got "${id}"`);
  }
  if (`${parseInt(id, 10)}` === id) {
    throw new Error(`job ID must not be an integer (BullMQ rejects it) — got "${id}"`);
  }
  return id;
}

/** `YYYY-MM` for the month a rent run belongs to. Used in the job ID, so it must be stable. */
export function monthLabel(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** `YYYY-MM-DD`, for once-per-day job IDs. */
export function dayLabel(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
