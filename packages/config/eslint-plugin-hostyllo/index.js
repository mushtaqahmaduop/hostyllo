'use strict';

/**
 * eslint-plugin-hostyllo — mechanical enforcement of the tenant-boundary invariants.
 *
 * Scoping note (2026-07-27): these rules are wired in `apps/api/eslint.config.js` for
 * `src/routes/**` only. Workers and the auth bootstrap connect through the PRIVILEGED pool by
 * design (migration 010 defines two connection identities: `hostyllo_app`, which is RLS-bound and
 * used by withTenant, and `postgres`, which is not and is used for cross-tenant work). Running
 * `require-with-tenant` over those directories would report ~90 correct-by-design calls. Route
 * handlers are where the invariant actually has teeth, so that is where the rule runs; the handful
 * of legitimate privileged calls inside `src/routes` carry an explicit eslint-disable with a
 * justification, which makes each exception reviewable instead of invisible.
 */

/** Unwrap TS-only wrappers (`x as T`, `x!`, `(x)`) so the rules see the real expression. */
function unwrap(node) {
  let n = node;
  while (
    n &&
    (n.type === 'TSAsExpression' ||
      n.type === 'TSNonNullExpression' ||
      n.type === 'TSTypeAssertion')
  ) {
    n = n.expression;
  }
  return n;
}

/**
 * Objects whose `.delete()` is HTTP route registration, not a DB write. Fastify's instance method
 * `app.delete('/rooms/:id', …)` collides with the DB verb list below and produced one false
 * positive in every route module that has a DELETE endpoint.
 */
const HTTP_INSTANCE_IDENT = /^_?(app|fastify|server|instance|router)$/;

const REQUEST_IDENT = /^_?(req|request)$/;
const REQUEST_INPUTS = new Set(['body', 'params', 'query']);
const HOSTEL_ID_KEYS = new Set(['hostel_id', 'hostelId']);

/** True for `request.body` / `req.params` / `request.query` (after unwrapping casts). */
function isRequestInput(node) {
  const n = unwrap(node);
  return (
    n &&
    n.type === 'MemberExpression' &&
    !n.computed &&
    n.object.type === 'Identifier' &&
    REQUEST_IDENT.test(n.object.name) &&
    n.property.type === 'Identifier' &&
    REQUEST_INPUTS.has(n.property.name)
  );
}

module.exports = {
  rules: {
    'require-with-tenant': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Every DB query must be wrapped in withTenant()',
        },
        schema: [],
      },
      create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();

        return {
          CallExpression(node) {
            const dbMethods = ['query', 'select', 'insert', 'update', 'delete'];
            const callee = node.callee;
            if (
              callee.type !== 'MemberExpression' ||
              callee.property.type !== 'Identifier' ||
              !dbMethods.includes(callee.property.name)
            ) {
              return;
            }

            // `app.delete('/rooms/:id', …)` is a route registration, not a DB call.
            if (
              callee.object.type === 'Identifier' &&
              HTTP_INSTANCE_IDENT.test(callee.object.name)
            ) {
              return;
            }

            // `withTenant` may appear anywhere up the ancestor chain — the query normally sits
            // inside the async callback passed to it, so this is not a parent check.
            const ancestors = sourceCode.getAncestors
              ? sourceCode.getAncestors(node)
              : context.getAncestors();

            const insideWithTenant = ancestors.some(
              (a) =>
                a.type === 'CallExpression' &&
                ((a.callee.type === 'Identifier' && a.callee.name === 'withTenant') ||
                  (a.callee.type === 'MemberExpression' &&
                    a.callee.property.type === 'Identifier' &&
                    a.callee.property.name === 'withTenant')),
            );

            if (!insideWithTenant) {
              context.report({
                node,
                message:
                  'INVARIANT-2: DB query must be wrapped in withTenant(). If this is a deliberate ' +
                  'privileged/cross-tenant query, disable this rule on the line with a justification.',
              });
            }
          },
        };
      },
    },

    'no-hostel-id-from-request': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'hostel_id must come from the JWT (request.hostelId) only, never from the request body, params or query',
        },
        schema: [],
      },
      create(context) {
        const report = (node) =>
          context.report({
            node,
            message: 'INVARIANT-3: hostel_id must come from request.hostelId (JWT) only',
          });

        return {
          // request.body.hostel_id  ·  (request.query as X).hostelId  ·  req.params.hostel_id
          MemberExpression(node) {
            if (node.computed) {
              // request.body['hostel_id']
              if (
                node.property.type === 'Literal' &&
                HOSTEL_ID_KEYS.has(node.property.value) &&
                isRequestInput(node.object)
              ) {
                report(node);
              }
              return;
            }
            if (
              node.property.type === 'Identifier' &&
              HOSTEL_ID_KEYS.has(node.property.name) &&
              isRequestInput(node.object)
            ) {
              report(node);
            }
          },

          // const { hostel_id } = request.body  ·  const { hostelId: h } = request.query as X
          VariableDeclarator(node) {
            if (!node.init || node.id.type !== 'ObjectPattern') return;
            if (!isRequestInput(node.init)) return;
            for (const prop of node.id.properties) {
              if (
                prop.type === 'Property' &&
                !prop.computed &&
                prop.key.type === 'Identifier' &&
                HOSTEL_ID_KEYS.has(prop.key.name)
              ) {
                report(prop);
              }
            }
          },
        };
      },
    },
  },
};
