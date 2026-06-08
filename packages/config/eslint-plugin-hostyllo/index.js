'use strict';

module.exports = {
  rules: {
    'require-with-tenant': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Every DB query must be wrapped in withTenant()',
        },
      },
      create(context) {
        return {
          CallExpression(node) {
            const dbMethods = ['query', 'select', 'insert', 'update', 'delete'];
            if (
              node.callee.type === 'MemberExpression' &&
              dbMethods.includes(node.callee.property.name)
            ) {
              // Walk up to find if inside withTenant()
              let parent = node.parent;
              let insideWithTenant = false;
              while (parent) {
                if (
                  parent.type === 'CallExpression' &&
                  parent.callee.name === 'withTenant'
                ) {
                  insideWithTenant = true;
                  break;
                }
                parent = parent.parent;
              }
              if (!insideWithTenant) {
                context.report({
                  node,
                  message: 'INVARIANT-2: DB query must be wrapped in withTenant()',
                });
              }
            }
          },
        };
      },
    },

    'no-hostel-id-from-request': {
      meta: {
        type: 'problem',
        docs: {
          description: 'hostel_id must come from JWT only, never from req.body/params/query',
        },
      },
      create(context) {
        return {
          MemberExpression(node) {
            const forbidden = ['body', 'params', 'query'];
            if (
              node.object.type === 'MemberExpression' &&
              node.object.object.name === 'req' &&
              forbidden.includes(node.object.property.name) &&
              node.property.name === 'hostel_id'
            ) {
              context.report({
                node,
                message: 'INVARIANT-3: hostel_id must come from req.hostelId (JWT) only',
              });
            }
          },
        };
      },
    },
  },
};