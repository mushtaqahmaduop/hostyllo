import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Producer/worker parity.
 *
 * The defect this exists to prevent: for the whole of Phase 1 `apps/api` constructed four `Worker`s
 * and zero `Queue`s. Every worker was subscribed to a queue nobody wrote to, so rent was never
 * generated, pending cancellations were never confirmed (beds stayed occupied forever) and PII was
 * never purged. Nothing failed — the jobs simply never existed. A green test suite proved nothing
 * because no test ever asserted that the two halves met.
 *
 * These are static-source assertions on purpose: they need no Redis, so they run on every CI push
 * rather than only in the integration job.
 */

const WORKERS_DIR = join(import.meta.dirname, '..', 'workers');
const QUEUES_FILE = join(import.meta.dirname, '..', 'lib', 'queues.ts');

/** Queue names a `new Worker('name', ...)` consumes. */
function workerQueueNames(): string[] {
  const names: string[] = [];
  for (const file of readdirSync(WORKERS_DIR)) {
    if (!file.endsWith('.ts') || file === 'dlq.ts') continue;
    const src = readFileSync(join(WORKERS_DIR, file), 'utf8');
    for (const m of src.matchAll(/new Worker(?:<[^>]*>)?\(\s*'([^']+)'/g)) names.push(m[1]);
  }
  return [...new Set(names)].sort();
}

/** Queue names something actually constructs a `new Queue('name', ...)` for. */
function producerQueueNames(): string[] {
  const names: string[] = [];
  const files = [QUEUES_FILE, ...readdirSync(WORKERS_DIR).map((f) => join(WORKERS_DIR, f))];
  for (const path of files) {
    if (!path.endsWith('.ts')) continue;
    const src = readFileSync(path, 'utf8');
    for (const m of src.matchAll(/new Queue(?:<[^>]*>)?\(\s*'([^']+)'/g)) names.push(m[1]);
  }
  return [...new Set(names)].sort();
}

describe('BullMQ producer/worker parity', () => {
  it('every worker has a queue that something produces to', () => {
    const workers = workerQueueNames();
    const producers = producerQueueNames();

    expect(workers.length).toBeGreaterThan(0);

    const orphanedWorkers = workers.filter((n) => !producers.includes(n));
    expect(
      orphanedWorkers,
      `Worker(s) listening on a queue with no producer: ${orphanedWorkers.join(', ')}. ` +
        'Either add a producer in lib/queues.ts, or delete the worker.'
    ).toEqual([]);
  });

  it('every queue constructed has a worker to drain it', () => {
    const workers = workerQueueNames();
    const producers = producerQueueNames();

    const orphanedQueues = producers.filter((n) => !workers.includes(n));
    expect(
      orphanedQueues,
      `Queue(s) with no worker — jobs would accumulate unread: ${orphanedQueues.join(', ')}`
    ).toEqual([]);
  });

  it('enqueues use deterministic job IDs so replicas cannot double-fire', () => {
    // Rent generation is the money path: two replicas ticking the same cron must produce one job.
    const src = readFileSync(join(WORKERS_DIR, 'dispatch.ts'), 'utf8');
    const addCalls = [...src.matchAll(/\.add\(/g)].length;
    const jobIds = [...src.matchAll(/jobId:/g)].length;

    expect(addCalls).toBeGreaterThan(0);
    expect(jobIds, 'every .add() in dispatch.ts must pass an explicit jobId').toBe(addCalls);
  });

  it('does not schedule the PII purge while it is incomplete', () => {
    // purgePii clears CNIC only; the lifecycle spec also requires name/phone/email/photo.
    // Scheduling it would produce a purge that satisfies neither the spec nor PDPA.
    const src = readFileSync(join(WORKERS_DIR, 'dispatch.ts'), 'utf8');
    const scheduled = /upsertJobScheduler\(\s*'[^']*purge/i.test(src);
    expect(scheduled, 'pii_purge must not be scheduled until the purge itself is complete').toBe(
      false
    );
  });
});
