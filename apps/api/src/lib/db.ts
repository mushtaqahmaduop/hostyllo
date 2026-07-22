// Thin re-export of the canonical DB layer from @hostyllo/db (audit M1: there is now ONE
// pool + one withTenant, owned by packages/db, instead of a duplicate insecure copy here).
// Routes/workers keep importing from '../lib/db.js'; nothing else changes.
export { pool, withTenant, dbHealthCheck } from '@hostyllo/db';
