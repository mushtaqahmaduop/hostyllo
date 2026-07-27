/**
 * Role policy — the single place the PRD §4.2 permission matrix is expressed in code.
 *
 * Before this file existed, each of the 64 endpoints inlined its own role array. They drifted, and
 * the drift was invisible because no two files sat next to each other: `chain_manager` ended up
 * able to reveal a student's CNIC and bulk-import students while being unable to read one, and
 * `viewer` — a role the DB CHECK constraint permits — appeared in zero guards, so such a user
 * could log in and receive 403 from every endpoint in the product.
 *
 * PRD v15.0 §4.2, verbatim, for the four roles the `users.role` CHECK actually allows
 * (`super_admin` is a platform-level role that does not exist in this table — it belongs to the
 * Phase-3 admin app):
 *
 *   Action              | hostel_owner | chain_manager | warden           | viewer
 *   --------------------|--------------|---------------|------------------|--------
 *   Add/edit student    |      ✓       |       ✓       |        ✓         |   —
 *   Delete student      |      ✓       |       —       | can_delete flag  |   —
 *   Record payment      |      ✓       |       ✓       |        ✓         |   —
 *   Edit payment        |      ✓       |       —       | void-request only|   —
 *   Manage rooms        |      ✓       |       ✓       |        ✓         |   —
 *   Settings access     |      ✓       |       —       | can_settings flag|   —
 *   View reports        |      ✓       |       ✓       |        ✓         |   ✓
 *   Manage billing      |      ✓       |       —       |        —         |   —
 *   Export all data     |      ✓       |       —       |        —         |   —
 *
 * NOTE — the per-warden `can_delete` / `can_settings` / `can_edit` flags in PRD §4.3 are NOT
 * implemented: the columns do not exist in any migration, so wardens currently get the role-level
 * answer for those rows. That gap is tracked in tasks/todo; it is deliberate (no consumer yet),
 * not an oversight, and this file is where it would be wired in.
 */

export const ROLES = {
  OWNER: 'hostel_owner',
  CHAIN: 'chain_manager',
  WARDEN: 'warden',
  VIEWER: 'viewer',
} as const;

const { OWNER, CHAIN, WARDEN, VIEWER } = ROLES;

/**
 * "View reports" — every role including the read-only one. Use for GET endpoints that expose
 * ordinary operational data: students, rooms, payments, expenses, dashboard, and the operational
 * logs (complaints, maintenance, notices, check-in, cancellations, fines).
 */
export const CAN_READ = [OWNER, CHAIN, WARDEN, VIEWER];

/**
 * Day-to-day operational writes: add/edit student, record payment, manage rooms, and the
 * operational logs. Everyone except the read-only viewer.
 */
export const CAN_OPERATE = [OWNER, CHAIN, WARDEN];

/**
 * Owner-level actions the matrix denies to chain managers: editing a payment after the fact,
 * settings, billing, and bulk data export. Wardens are excluded here too — their equivalents are
 * either flag-gated (§4.3, unimplemented) or a request flow such as payment void-request.
 */
export const OWNER_ONLY = [OWNER];

/**
 * Reads that are NOT "reports": the audit trail and anything that reveals stored PII. Kept off
 * `CAN_READ` deliberately — a read-only reporting account should not be able to enumerate the
 * security log or decrypt a national identity number.
 */
export const SENSITIVE_READ = [OWNER, CHAIN];

/**
 * Chain-level financial movement between branches (`/transfers`) and user administration.
 * A warden runs one hostel and has no business moving money between them or creating accounts.
 */
export const CHAIN_LEVEL = [OWNER, CHAIN];
