'use strict';

/**
 * Rule tests for eslint-plugin-hostyllo.
 *
 * These exist because the rules spent months registered in the docs but never loaded by any
 * ESLint config, and `no-hostel-id-from-request` reported 0 errors partly because it only matched
 * an identifier named `req` while every route in this codebase names it `request`. A rule that
 * silently matches nothing looks exactly like a codebase with no violations. The invalid cases
 * below are the guard against that: each one must actually fire.
 *
 *   node --test packages/config/eslint-plugin-hostyllo/index.test.js
 */

const { RuleTester } = require('eslint');
const tsparser = require('@typescript-eslint/parser');
const plugin = require('./index.js');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsparser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-with-tenant', plugin.rules['require-with-tenant'], {
  valid: [
    // The canonical route shape: query inside the withTenant callback, several levels deep.
    `await withTenant(request.hostelId, async (db) => {
       const r = await db.query('SELECT 1');
       return r.rows;
     });`,
    // Nested inside further callbacks/conditionals — the rule walks all ancestors, not just parent.
    `await withTenant(request.hostelId, async (db) => {
       if (x) { await Promise.all(ids.map(async (id) => { await db.query('SELECT 1', [id]); })); }
     });`,
    // Fastify route registration, not a DB write. This collides with the `delete` verb and used to
    // produce one false positive in every route module that has a DELETE endpoint.
    `app.delete('/rooms/:id', {}, async (request, reply) => reply.send());`,
    `fastify.delete('/x', handler);`,
    // Not a DB method at all.
    `arr.map(x => x);`,
    `cache.get(key);`,
  ],
  invalid: [
    {
      code: `await pool.query('SELECT * FROM public.students');`,
      errors: [{ message: /INVARIANT-2/ }],
    },
    {
      code: `async function h() { const r = await client.query('SELECT 1'); return r; }`,
      errors: [{ message: /INVARIANT-2/ }],
    },
    {
      // withTenant is called, but the query is outside its callback.
      code: `await withTenant(id, async (db) => db.query('SELECT 1'));
             await pool.query('SELECT 2');`,
      errors: [{ message: /INVARIANT-2/ }],
    },
    {
      code: `await db.delete('students');`,
      errors: [{ message: /INVARIANT-2/ }],
    },
  ],
});

ruleTester.run('no-hostel-id-from-request', plugin.rules['no-hostel-id-from-request'], {
  valid: [
    `const id = request.hostelId;`,
    `await withTenant(request.hostelId, fn);`,
    // A hostel_id coming from a DB row is fine — the rule is about request-supplied input.
    `const h = row.hostel_id;`,
    `const { hostel_id } = user;`,
    // Other body fields are untouched.
    `const { studentId, amount } = request.body;`,
  ],
  invalid: [
    {
      code: `const h = request.body.hostel_id;`,
      errors: [{ message: /INVARIANT-3/ }],
    },
    {
      // `request`, not `req` — this is the naming every route in apps/api actually uses, and the
      // case the original rule missed entirely.
      code: `const h = request.query.hostelId;`,
      errors: [{ message: /INVARIANT-3/ }],
    },
    {
      code: `const h = req.params.hostel_id;`,
      errors: [{ message: /INVARIANT-3/ }],
    },
    {
      // TS cast between the request and the property — the shape routes actually write.
      code: `const h = (request.body as { hostel_id: string }).hostel_id;`,
      errors: [{ message: /INVARIANT-3/ }],
    },
    {
      code: `const { hostel_id } = request.body;`,
      errors: [{ message: /INVARIANT-3/ }],
    },
    {
      code: `const { hostelId: h } = request.query as Record<string, string>;`,
      errors: [{ message: /INVARIANT-3/ }],
    },
    {
      code: `const h = request.body['hostel_id'];`,
      errors: [{ message: /INVARIANT-3/ }],
    },
  ],
});

console.log('eslint-plugin-hostyllo: all rule tests passed');
