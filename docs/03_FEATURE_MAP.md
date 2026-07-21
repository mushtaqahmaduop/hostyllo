# HOSTYLLO — Feature Map
## 03_FEATURE_MAP.md
## v15.0 — Merged Feature Inventory (FR-IDs + Priority Emojis)
## Source: MASTER PRD v15.0
## Classification: Confidential — Founder Only

---

> **How to use this document:**
> Every feature has a Phase tag and FR-ID for agent code generation ("build FR-PAY-02" is unambiguous).
> Emoji priority is for quick scanning in planning mode.
> When asked "should we build X?", look it up here first.
> If it's not in this map, it is not in the PRD, and it does not get built.

> **Legend:**
> 🟢 P0 = Must ship in its Phase (blocks launch)
> 🟡 P1 = Should ship in its Phase (strong value)
> 🔵 P2 = Nice to have (can defer to next phase)
> ❌ DEFERRED = Not in 24-month roadmap

---

## FEATURE CATEGORY INDEX

| # | Category | Feature Count | Phase Range |
|---|----------|:-------------:|:-----------:|
| 1 | Authentication & Security | 16 | Phase 1 |
| 2 | Student Management | 22 | Phase 1–3 |
| 3 | Room & Bed Management | 10 | Phase 1 |
| 4 | Payments & Receipt Engine | 17 | Phase 1 |
| 5 | Expenses | 7 | Phase 1 |
| 6 | Owner Transfers | 4 | Phase 1 |
| 7 | Cancellations | 7 | Phase 2 |
| 8 | Maintenance Requests | 4 | Phase 2 |
| 9 | Complaints | 3 | Phase 2 |
| 10 | Check-In / Out Log | 2 | Phase 2 |
| 11 | Notices Board | 3 | Phase 2 |
| 12 | Fines | 3 | Phase 2 |
| 13 | Room Inspections | 2 | Phase 2.5 |
| 14 | Bill Split Calculator | 2 | Phase 2.5 |
| 15 | Reports & Annual Archive | 7 | Phase 2 |
| 16 | Global Search | 3 | Phase 2 |
| 17 | Settings (11 tabs) | 11 tabs | Phase 1 (3) / Phase 2 (8) |
| 18 | Activity Log / Audit Trail | 5 | Phase 1 |
| 19 | Dashboard | 10 | Phase 1 |
| 20 | WhatsApp & Notifications | 10 | Phase 3 |
| 21 | Onboarding Wizard | 7 steps | Phase 3 |
| 22 | Super Admin Panel | 12 | Phase 3 |
| 23 | Billing & Subscriptions | 11 | Phase 4 |
| 24 | Offline Sync Engine | 5 | Phase 5 |
| 25 | Product-Layer Features | 11 | Phase 2–4 |
| 26 | Intelligence Features (AI Tiers) | 12 | Phase 3–7 |
| 27 | Automation Pipelines | 12 | Phase 1–4 |
| 28 | Chain / Multi-Branch | 4 | Phase 6 |

---

## 1. AUTHENTICATION & SECURITY

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-AUTH-01 | Email + password login, bcrypt ≥ 12 rounds | 🟢 P0 | 1 | |
| FR-AUTH-02 | JWT RS256 access token (15 min) + httpOnly refresh (7-day rolling) | 🟢 P0 | 1 | |
| FR-AUTH-03 | RS256 ONLY in jwtVerify — reject HS256 | 🟢 P0 | 1 | **INVARIANT** |
| FR-AUTH-04 | RBAC: super_admin › hostel_owner › chain_manager › warden › viewer | 🟢 P0 | 1 | |
| FR-AUTH-05 | Per-warden flags: can_delete · can_settings · can_edit — from DB not JWT | 🟢 P0 | 1 | |
| FR-AUTH-06 | Password reset via email OTP (6-digit, 10-min, max 5 attempts) | 🟢 P0 | 1 | |
| FR-AUTH-07 | Rate limiting: 10 login attempts / 15 min / IP via Redis | 🟢 P0 | 1 | |
| FR-AUTH-08 | TOTP MFA: mandatory super_admin, optional hostel_owner | 🟢 P0 | 1 | |
| FR-AUTH-09 | TOTP secrets: AES-256 encrypted — never plaintext | 🟢 P0 | 1 | |
| FR-AUTH-10 | Session invalidation on password change via jti blocklist | 🟢 P0 | 1 | |
| FR-AUTH-11 | IP whitelist for super admin panel (ADMIN_ALLOWED_IPS) | 🟢 P0 | 1 | |
| FR-AUTH-12 | SameSite=Strict on httpOnly cookie | 🟢 P0 | 1 | |
| FR-AUTH-13 | Theme (system/light/dark) + language (en/ur) stored per user | 🟢 P0 | 1 | |
| FR-AUTH-14 | Identical error message: wrong email vs wrong password | 🟢 P0 | 1 | |
| FR-AUTH-15 | Legacy SHA-256 password migration on first login | 🟡 P1 | 1 | |
| FR-AUTH-16 | Role fetched from DB on every request — never trusted from JWT | 🟢 P0 | 1 | |

---

## 2. STUDENT MANAGEMENT

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-STU-01 | Add student: full field set (name, father, CNIC, phone, emergency, email, occupation, address, city, photo, join date, room/bed, rent, deposit, admission fee) | 🟢 P0 | 1 | |
| FR-STU-02 | CNIC auto-format: XXXXX-XXXXXXX-X (port `fmtCnic()` verbatim) | 🟢 P0 | 1 | |
| FR-STU-03 | Phone auto-format: 03XX-XXXXXXX (port `fmtPhone()` verbatim) | 🟢 P0 | 1 | |
| FR-STU-04 | CNIC AES-256 encrypted in DB — masked in all API responses | 🟢 P0 | 1 | **INVARIANT** |
| FR-STU-05 | CNIC reveal: explicit user action + audit_log entry | 🟢 P0 | 1 | |
| FR-STU-06 | Photo: upload from file OR live camera (getUserMedia) | 🟡 P1 | 1 | |
| FR-STU-07 | Photo validation: MIME + magic bytes, max 2MB, resize 200×200 | 🟢 P0 | 1 | |
| FR-STU-08 | Security deposit tracking: deposit_pkr, status, paid_at, notes | 🟡 P1 | 2 | |
| FR-STU-09 | Admission fee per student: admission_fee_pkr column | 🟢 P0 | 1 | |
| FR-STU-10 | Status lifecycle: active → on_leave → vacated | 🟢 P0 | 1 | |
| FR-STU-11 | Search by name / CNIC / room / city / parent — < 200ms (pg_trgm GIN) | 🟢 P0 | 1 | |
| FR-STU-12 | Duplicate CNIC detection — warn + block within same hostel | 🟢 P0 | 1 | |
| FR-STU-13 | Student profile: payment history, room shifts, check-in log, audit trail (5-tab view) | 🟢 P0 | 2 | |
| FR-STU-14 | "Save & Proceed to Payment" — pre-filled payment modal | 🟢 P0 | 2 | |
| FR-STU-15 | Former students view — all vacated/cancelled with restore option | 🟢 P0 | 2 | |
| FR-STU-16 | Bulk CSV import: strip formula chars, validate, preview, confirm | 🟢 P0 | 2 | |
| FR-STU-17 | Export: CSV + branded PDF with month selector | 🟢 P0 | 2 | |
| FR-STU-18 | Soft-delete: deleted_at TIMESTAMPTZ — never hard delete | 🟢 P0 | 1 | |
| FR-STU-19 | Cross-branch duplicate CNIC detection (chain owners) | 🟡 P1 | 6 | |
| FR-STU-20 | Student transfer between branches (chain owners only) | 🟡 P1 | 6 | |
| FR-STU-21 | Pakistani city autocomplete (200+ cities) | 🟡 P1 | 2 | New from Set B (STU-20) |
| FR-STU-22 | Extended city/region data for autocomplete refresh | 🔵 P2 | 3 | Combined coverage |

---

## 3. ROOM & BED MANAGEMENT

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-RM-01 | Add/edit rooms: number, floor, type, color, capacity, fee, amenities, notes | 🟢 P0 | 1 | |
| FR-RM-02 | Room types with hex color (port from Electron settings.roomTypes[].colour) | 🟢 P0 | 1 | |
| FR-RM-03 | Bed-level granularity: own ID, label, status, occupant | 🟢 P0 | 1 | |
| FR-RM-04 | Real-time occupancy grid: gold=free, green=full, grey=maintenance | 🟢 P0 | 2 | |
| FR-RM-05 | Assign student to specific bed — prevent overbooking | 🟢 P0 | 1 | |
| FR-RM-06 | Room shift: move student → logs to room_shifts → auto-suggests rent | 🟢 P0 | 2 | |
| FR-RM-07 | Maintenance mode: room blocked with estimated return date | 🟢 P0 | 2 | |
| FR-RM-08 | Room history: all students who ever stayed + dates | 🟢 P0 | 2 | |
| FR-RM-09 | Bulk fee update: by room type / all / per-student table (3 modes) | 🟢 P0 | 2 | |
| FR-RM-10 | Delete room: blocked if active occupants → RM_002 error | 🟢 P0 | 1 | |

---

## 4. PAYMENTS & RECEIPT ENGINE

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-PAY-01 | Record payment: full field set (student, rent, admission fee, extras, concession, amount paid, due date, method, month, date, notes) | 🟢 P0 | 1 | |
| FR-PAY-02 | **Payment formula (port verbatim):** `totalDue = rent + admFee + sum(extras) − concession; unpaid = Math.max(0, totalDue − paid); status` | 🟢 P0 | 1 | **14 UNIT TESTS** |
| FR-PAY-03 | Student typeahead: 200ms debounced → auto-fills rent, method, unpaid balance | 🟢 P0 | 2 | |
| FR-PAY-04 | Sequential PDF receipt: hostel-branded, atomic `get_next_receipt_number()` | 🟢 P0 | 1 | |
| FR-PAY-05 | Receipt PDF fields: logo, name, tagline, receipt#, student, masked CNIC, room, month, breakdown, paid, balance, due date, method, signature area | 🟢 P0 | 1 | BullMQ async |
| FR-PAY-06 | Auto-generate monthly pending records: one-click, all active students, idempotent | 🟢 P0 | 1 | |
| FR-PAY-07 | Defaulters list: unpaid/partial by month + total amount | 🟢 P0 | 2 | |
| FR-PAY-08 | WhatsApp reminder: per-student pre-filled message | 🟢 P0 | 2 | |
| FR-PAY-09 | Bulk WhatsApp blast: 2s delay, 250/day cap, SMS fallback, warn if >250 | 🟢 P0 | 3 | |
| FR-PAY-10 | Payment edit with audit log — hostel_owner only | 🟢 P0 | 1 | |
| FR-PAY-11 | Void workflow: warden void-request → owner void-confirm | 🟢 P0 | 2 | |
| FR-PAY-12 | Soft-delete: deleted_at on payments — never hard delete | 🟢 P0 | 1 | |
| FR-PAY-13 | Partial payment support: track balance owed across months | 🟢 P0 | 1 | |
| FR-PAY-14 | Overpayment: excess auto-credited to next month | 🟡 P1 | 2 | |
| FR-PAY-15 | Advance payment: 3+ months upfront auto-applied monthly | 🟡 P1 | 2 | |
| FR-PAY-16 | WhatsApp receipt immediately after payment — "Send Receipt" button | 🟢 P0 | 3 | |
| FR-PAY-17 | Idempotency key: X-Idempotency-Key header, Redis 24h, duplicate → original | 🟢 P0 | 1 | |

---

## 5. EXPENSES

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-EXP-01 | Expense list: category, description, amount PKR, date — month filter | 🟢 P0 | 1 |
| FR-EXP-02 | Add expense: category, description, amount, date, notes | 🟢 P0 | 1 |
| FR-EXP-03 | Edit and soft-delete expenses | 🟢 P0 | 1 |
| FR-EXP-04 | Default categories (port verbatim from Electron): Electricity, Water, Gas, Maintenance, Cleaning, Security, Internet, Furniture, Plumbing, Other | 🟢 P0 | 1 |
| FR-EXP-05 | Configurable categories in Settings → Expense Categories tab | 🟢 P0 | 2 |
| FR-EXP-06 | Expense summary: total by category for month | 🟢 P0 | 2 |
| FR-EXP-07 | Expenses included in Dashboard Net Fund and Reports | 🟢 P0 | 1 |

---

## 6. OWNER TRANSFERS

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-TRF-01 | Record transfer: description, amount, method, received by, date, notes | 🟢 P0 | 1 |
| FR-TRF-02 | Edit, soft-delete transfers | 🟢 P0 | 1 |
| FR-TRF-03 | Transfers included in Dashboard "To Owner" card and net profit | 🟢 P0 | 1 |
| FR-TRF-04 | Quick transfer shortcut from Dashboard | 🟢 P0 | 1 |

---

## 7. CANCELLATIONS

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-CANC-01 | Cancellation list: filter by Pending/Confirmed/Restored | 🟢 P0 | 2 | |
| FR-CANC-02 | Add cancellation: student typeahead, reason, vacate date, notes | 🟢 P0 | 2 | |
| FR-CANC-03 | Confirm cancellation: frees room/bed, status → 'vacated' | 🟢 P0 | 2 | |
| FR-CANC-04 | Restore cancellation: student re-set to 'active' | 🟢 P0 | 2 | |
| FR-CANC-05 | Auto-confirm nightly cron: port `processAutoCancellations()` verbatim | 🟢 P0 | 2 | BullMQ auto-cancel queue |
| FR-CANC-06 | Dashboard alert banner: pending count shown in red | 🟢 P0 | 2 | |
| FR-CANC-07 | Student status does NOT change when cancellation is ADDED — only when CONFIRMED | 🟢 P0 | 2 | Critical logic |

---

## 8. MAINTENANCE REQUESTS

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-MAINT-01 | List: filter by status (open/in_progress/resolved), priority, room | 🟢 P0 | 2 |
| FR-MAINT-02 | Add: title, description, room (optional), priority (Low/Medium/High/Urgent), date | 🟢 P0 | 2 |
| FR-MAINT-03 | Status progression: open → in_progress → resolved | 🟢 P0 | 2 |
| FR-MAINT-04 | Dashboard alert banner: open count (combined with complaints) | 🟢 P0 | 2 |

---

## 9. COMPLAINTS

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-COMPL-01 | List: filter by status, priority | 🟢 P0 | 2 |
| FR-COMPL-02 | Add: title, description, student (optional), priority, date | 🟢 P0 | 2 |
| FR-COMPL-03 | Resolve: add response text, set resolved + resolvedDate | 🟢 P0 | 2 |

---

## 10. CHECK-IN / OUT LOG

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-CI-01 | Log entry: student, type (check_in/check_out/leave/return), date/time, notes | 🟢 P0 | 2 |
| FR-CI-02 | Per-student movement history | 🟢 P0 | 2 |

---

## 11. NOTICES BOARD

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-NOT-01 | Post notice: title, content, type (6 types), expiry date | 🟢 P0 | 2 |
| FR-NOT-02 | Active notices shown on Dashboard | 🟢 P0 | 2 |
| FR-NOT-03 | Super Admin can broadcast global notice (hostel_id = NULL) | 🟢 P0 | 3 |

---

## 12. FINES

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-FINE-01 | Add fine: student, reason, amount, date | 🟢 P0 | 2 |
| FR-FINE-02 | Mark fine as paid | 🟢 P0 | 2 |
| FR-FINE-03 | Soft-delete fine | 🟢 P0 | 2 |

---

## 13. ROOM INSPECTIONS

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-INS-01 | Add inspection: room, inspector name, rating (1–5), notes, issues list, date | 🟡 P1 | 2.5 |
| FR-INS-02 | Inspection history per room | 🟡 P1 | 2.5 |

---

## 14. BILL SPLIT CALCULATOR

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-BILL-01 | Split utility bill: total amount, participants, split type (equal/custom), notes | 🟡 P1 | 2.5 |
| FR-BILL-02 | Save split result to bill_splits table | 🟡 P1 | 2.5 |

---

## 15. REPORTS & ANNUAL ARCHIVE

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-RPT-01 | Monthly detail: Revenue, Expenses, Transfers, Net Profit, Occupancy %, Student count | 🟢 P0 | 2 |
| FR-RPT-02 | Monthly payments table: full row-level breakdown | 🟢 P0 | 2 |
| FR-RPT-03 | Net summary: Revenue − Expenses − Transfers = Net Fund | 🟢 P0 | 2 |
| FR-RPT-04 | Export monthly report as branded PDF | 🟢 P0 | 2 |
| FR-RPT-05 | Export monthly payments/expenses as CSV | 🟢 P0 | 2 |
| FR-RPT-06 | Share via WhatsApp: month summary message | 🟢 P0 | 3 |
| FR-RPT-07 | Annual Archive: year tabs, 12-month grid, annual totals, trend chart | 🟢 P0 | 2.5 |

---

## 16. GLOBAL SEARCH

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-SRCH-01 | Header search: global across students, payments, rooms, expenses | 🟢 P0 | 2 |
| FR-SRCH-02 | Results < 200ms via pg_trgm GIN index | 🟢 P0 | 2 |
| FR-SRCH-03 | Keyboard shortcut: Cmd/Ctrl+K opens search | 🟡 P1 | 3 |

---

## 17. SETTINGS — 11 TABS

| Tab | Phase | Key Features |
|-----|:-----:|--------------|
| Hostel Info | 1 (minimal) | Name, tagline, city, phone, email, logo, currency |
| Room Types | 1 (minimal) | Type name, capacity, default rent, color |
| Payment Methods | 1 (minimal) | Tag-list add/remove |
| Expense Categories | 2 | Tag-list add/remove |
| Floors | 2 | Tag-list of floor names |
| Theme & Display | 2 | 6 accent presets + custom hex + dark/light/system |
| Data Management | 2 | CSV import + template download + system stats |
| Rent Update | 2 | Bulk rent update (3 modes) |
| Annual Archive | 2 | Link to Archive page |
| Splash Screen | 2 | App name, tagline, bg color, custom image, font |
| Subscription | 3 | Plan status, expiry, days remaining, upgrade |

---

## 18. ACTIVITY LOG / AUDIT TRAIL

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-LOG-01 | Every create/edit/delete/login/backup/import writes to audit_log | 🟢 P0 | 1 | |
| FR-LOG-02 | Log entry: action, entity_type, entity_id, user, IP, user_agent, old_value, new_value, timestamp | 🟢 P0 | 1 | |
| FR-LOG-03 | Tamper-evident: SHA-256 hash chain | 🟢 P0 | 1 | |
| FR-LOG-04 | INSERT ONLY — no UPDATE, no DELETE, ever | 🟢 P0 | 1 | **INVARIANT** |
| FR-LOG-05 | Super Admin impersonation logged with impersonated_by | 🟢 P0 | 1 | |

---

## 19. DASHBOARD

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-DASH-01 | 5 KPI cards (Revenue, Pending, Expenses, To Owner, Net Fund) | 🟢 P0 | 1 | Single aggregation query |
| FR-DASH-02 | Alert banners: pending cancellations, unpaid, maintenance, complaints, occupancy | 🟢 P0 | 2 | Port from Electron exactly |
| FR-DASH-03 | Occupancy grid: all rooms, bed status (gold/green/grey) | 🟢 P0 | 2 | |
| FR-DASH-04 | Monthly trend chart | 🟡 P1 | 2 | |
| FR-DASH-05 | Quick action: "Record Transfer" shortcut | 🟢 P0 | 1 | |
| FR-DASH-06 | Connectivity status badge in header | 🟢 P0 | 1 | |
| FR-DASH-07 | Theme toggle in header | 🟢 P0 | 1 | |
| FR-DASH-08 | Language toggle EN/UR in header | 🟡 P1 | 2 | |
| FR-DASH-09 | Notification bell | 🟡 P1 | 2 | |
| FR-DASH-10 | Dashboard load < 200ms via single CTE query | 🟢 P0 | 1 | See PRD Section 8.5 |

---

## 20. WHATSAPP & NOTIFICATIONS

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-WA-01 | Automated monthly payment reminder to all unpaid students | 🟢 P0 | 3 | |
| FR-WA-02 | Manual WhatsApp blast: select students, template, rate-limited queue | 🟢 P0 | 3 | |
| FR-WA-03 | WhatsApp Business API via 360dialog (Meta-approved) | 🟢 P0 | 5 | Apply Day 1 — 4–8 week approval |
| FR-WA-04 | Rate limit: 250/day — halt, resume next day via BullMQ | 🟢 P0 | 3 | |
| FR-WA-05 | 2-second delay between sends; 10:00 AM PKT preferred | 🟢 P0 | 3 | |
| FR-WA-06 | SMS fallback via Jazz API — same BullMQ queue | 🟡 P1 | 5 | |
| FR-WA-07 | Copy-paste fallback: pre-filled message text in modal | 🟢 P0 | 1 | Available Phase 1 (no WA needed) |
| FR-WA-08 | Email receipts and invoices via Resend | 🟢 P0 | 1 | |
| FR-WA-09 | Never block wizard or app on WhatsApp approval status | 🟢 P0 | 1 | **INVARIANT** |
| FR-WA-10 | WhatsApp receipt immediately after payment — "Send Receipt" button | 🟢 P0 | 3 | |

---

## 21. ONBOARDING WIZARD — 7 STEPS

| Step | Screen | Phase |
|:----:|--------|:-----:|
| 1 | Account Creation — email, password, name, phone + Turnstile | 3 |
| 2 | Hostel Profile — name, city, address, WhatsApp number | 3 |
| 3 | Logo & Branding — logo upload or skip, brand color | 3 |
| 4 | Room Setup — add minimum 1 room type with fee | 3 |
| 5 | First Student — add 1 student or skip / CSV import | 3 |
| 6 | WhatsApp Test — send test or skip | 3 |
| 7 | Done — confetti + summary: X rooms, Y students, Z PKR/mo expected | 3 |

All 7 steps tracked to `onboarding_events` table.
WhatsApp approval NEVER blocks onboarding (FR-WA-09).

---

## 22. SUPER ADMIN PANEL

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-ADM-01 | Access: admin.hostyllo.app, TOTP + IP whitelist | 🟢 P0 | 3 |
| FR-ADM-02 | Dashboard: MRR, active tenants, trial pipeline, churn, API health, queue depth | 🟢 P0 | 3 |
| FR-ADM-03 | Charts: MRR trend (12-month), tenant growth, plan distribution, onboarding funnel | 🟢 P0 | 3 |
| FR-ADM-04 | Tenant list: search, filter by plan/status, sort | 🟢 P0 | 3 |
| FR-ADM-05 | Tenant detail (8 tabs): Overview · Students · Payments · Subscription · Billing · Feature Flags · Activity Log · Actions | 🟢 P0 | 3 |
| FR-ADM-06 | Impersonation: 1-hour JWT, no refresh, logged with impersonated_by | 🟢 P0 | 3 |
| FR-ADM-07 | Suspend / Reactivate tenant | 🟢 P0 | 3 |
| FR-ADM-08 | DLQ jobs monitor: queue name, error, retry count, retry/discard | 🟢 P0 | 1 |
| FR-ADM-09 | Feature flags per hostel (override) | 🟡 P1 | 3 |
| FR-ADM-10 | Global notice broadcast | 🟢 P0 | 3 |
| FR-ADM-11 | Revenue deep dive | 🟡 P1 | 4 |
| FR-ADM-12 | Security events monitor | 🟡 P1 | 5 |

---

## 23. BILLING & SUBSCRIPTIONS

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-BIL-01 | Manual invoicing (bank transfer / JazzCash) | 🟢 P0 | 1 | Phase 1-3 only |
| FR-BIL-02 | Paymob JazzCash/EasyPaisa integration | 🟢 P0 | 4 | Apply in Phase 1 |
| FR-BIL-03 | 3 subscription plans (Starter/Pro/Enterprise) | 🟢 P0 | 4 | |
| FR-BIL-04 | 14-day free trial (no credit card) | 🟢 P0 | 3 | |
| FR-BIL-05 | 20% annual discount | 🟡 P1 | 4 | |
| FR-BIL-06 | Dunning sequence (7 steps: Day 0-31) | 🟢 P0 | 4 | |
| FR-BIL-07 | Plan feature gates (checkPlanFeature middleware) | 🟢 P0 | 4 | |
| FR-BIL-08 | Subscription page in Settings | 🟢 P0 | 3 | |
| FR-BIL-09 | Invoice PDF generation | 🟡 P1 | 4 | |
| FR-BIL-10 | Paymob webhook HMAC-SHA512 + timingSafeEqual | 🟢 P0 | 4 | CRITICAL |
| FR-BIL-11 | Multi-currency / Stripe (global) | ❌ DEFERRED | 6+ | PKR 500k MRR trigger |

---

## 24. OFFLINE SYNC ENGINE

| FR-ID | Feature | Priority | Phase | Notes |
|-------|---------|:--------:|:-----:|-------|
| FR-SYNC-01 | SQLite Wasm (OPFS) client — mirrors PostgreSQL schema | 🟡 P1 | 5 | Phase 5 ONLY |
| FR-SYNC-02 | Delta sync via POST /sync/push (max 500 rows/batch) | 🟡 P1 | 5 | |
| FR-SYNC-03 | CRDT conflict resolution: last-write-wins via vector clocks | 🟡 P1 | 5 | |
| FR-SYNC-04 | BullMQ sync processing (concurrency 20) | 🟡 P1 | 5 | |
| FR-SYNC-05 | Conflict log → visible in Super Admin | 🟡 P1 | 5 | |

---

## 25. PRODUCT-LAYER FEATURES

| FR-ID / GAP-ID | Feature | Priority | Phase |
|----------------|---------|:--------:|:-----:|
| GAP-P01 | User feedback widget (floating, 500 chars, 5/day) | 🟡 P1 | 2 |
| GAP-P02 | NPS survey (14-day trigger, 90-day cooldown, 0–10 + comment) | 🟡 P1 | 3 |
| GAP-P03 | Onboarding funnel event tracking (all 7 wizard steps) | 🟡 P1 | 3 |
| GAP-P04 | Mobile PWA: web manifest + install prompt + offline status badge | 🟢 P0 | 2 |
| GAP-P05 | "Download all my data" ZIP — hostel_owner only, 3/day | 🟡 P1 | 2 |
| GAP-P06 | Referral system: referral_code per hostel, PKR 500 credit on conversion | 🔵 P2 | 4 |
| GAP-P07 | Urdu UI toggle: next-intl, RTL layout, Noto Nastaliq Urdu font | 🟡 P1 | 3 |
| GAP-P09 | API versioning: /v1/ current, /v2/ migration path, 6-month overlap | 🟡 P1 | 1 |
| GAP-P10 | Disaster Recovery: RTO ≤ 4h, RPO ≤ 1h, PITR 7-day, monthly DR drill | 🟢 P0 | 0 |
| GAP-P11 | Student payment receipt on WhatsApp (immediate "Send Receipt" button) | 🟢 P0 | 3 |
| FR-PLT-11 | Landing page: hostyllo.app — pricing, CTA, testimonials | 🟡 P1 | 3 |

---

## 26. INTELLIGENCE FEATURES (AI TIERS)

| FR-ID | Feature | Priority | Phase | AI Tier |
|-------|---------|:--------:|:-----:|---------|
| FR-AI-01 | Payment risk scoring (rule-based: high/medium/low) | 🟡 P1 | 3 | Tier 1 |
| FR-AI-02 | Smart defaulter prioritization (risk × amount × days) | 🟡 P1 | 3 | Tier 1 |
| FR-AI-03 | Maintenance pattern detection (recurring issues) | 🟡 P1 | 3 | Tier 1 |
| FR-AI-04 | Occupancy trend calculation (moving average) | 🟡 P1 | 3 | Tier 1 |
| FR-AI-05 | Operational health widget (composite 0-100) | 🟡 P1 | 3 | Tier 1 |
| FR-AI-06 | Operational health analytics | 🟡 P1 | 3 | Tier 1 |
| FR-AI-07 | Occupancy forecasting (regression-based) | 🟡 P1 | 6 | Tier 2 |
| FR-AI-08 | Revenue forecasting (statistical) | 🟡 P1 | 6 | Tier 2 |
| FR-AI-09 | Fee collection probability per student | 🟡 P1 | 6 | Tier 2 |
| FR-AI-10 | AI rent suggestion (ML) | ❌ DEFERRED | 7 | Tier 3 |
| FR-AI-11 | NLP search ("show unpaid since January") | ❌ DEFERRED | 7 | Tier 3 |
| FR-AI-12 | Conversational AI assistant | ❌ DEFERRED | 7 | Tier 3 |

> **AI Tier Rules:**
> AI_RULE_1: Tier 1 (rule-based) = Phase 3. OK to build. No ML infrastructure needed.
> AI_RULE_2: Tier 2 (statistical) = Phase 6. PostgreSQL window functions + regression. No GPU.
> AI_RULE_3: Tier 3 (ML/LLM) = Phase 7 DEFERRED. DO NOT build. DO NOT design. DO NOT discuss.
> AI_RULE_4: All AI outputs labeled as "Based on payment history" — never just "AI predicts"
> AI_RULE_5: AI features never block core operations. Always a progressive enhancement layer.

---

## 27. AUTOMATION PIPELINES

| FR-ID | Feature | Priority | Phase | Trigger |
|-------|---------|:--------:|:-----:|---------|
| FR-AUTO-01 | Monthly rent generation (1st of month cron) | 🟢 P0 | 1 | Railway cron |
| FR-AUTO-02 | Nightly auto-cancel (vacate date reached) | 🟢 P0 | 1 | Railway cron |
| FR-AUTO-03 | PDF receipt generation (async BullMQ) | 🟢 P0 | 1 | Payment recorded |
| FR-AUTO-04 | WhatsApp receipt send | 🟡 P1 | 3 | Payment recorded |
| FR-AUTO-05 | Monthly payment reminder blast (5th of month) | 🟡 P1 | 3 | Cron |
| FR-AUTO-06 | Second blast (15th of month, still unpaid) | 🟡 P1 | 3 | Cron |
| FR-AUTO-07 | High-risk student alert to owner | 🟡 P1 | 3 | Risk score update |
| FR-AUTO-08 | Subscription dunning sequence (Day 0, 1, 3, 7, 8, 28, 31) | 🟢 P0 | 4 | Payment failure |
| FR-AUTO-09 | Maintenance escalation (7 days unresolved) | 🟡 P1 | 3 | Cron |
| FR-AUTO-10 | Recurring maintenance auto-flag | 🔵 P2 | 3 | Pattern detection |
| FR-AUTO-11 | Tenant data export on Day 28 dunning | 🟢 P0 | 4 | Dunning cron |
| FR-AUTO-12 | PII purge on Day 31 dunning | 🟢 P0 | 4 | Dunning cron |

---

## 28. CHAIN / MULTI-BRANCH

| FR-ID | Feature | Priority | Phase |
|-------|---------|:--------:|:-----:|
| FR-ENT-01 | Chain manager role with consolidated dashboard | 🟡 P1 | 6 |
| FR-ENT-02 | Cross-branch CNIC duplicate detection (FR-STU-19) | 🟡 P1 | 6 |
| FR-ENT-03 | Student transfer between branches (FR-STU-20) | 🟡 P1 | 6 |
| FR-ENT-04 | Revenue comparison across branches | 🟡 P1 | 6 |

---

## FEATURES EXPLICITLY NOT IN THIS PRODUCT (v1–v6)

These were never in the PRD and must not be built:

| Not-Feature | Why Out |
|-------------|---------| 
| Student portal (self-service) | DEFERRED Phase 7+; requires separate auth system |
| White-label / custom domain per hostel | DEFERRED Phase 7+ |
| Stripe / USD billing | DEFERRED: MRR > PKR 500k trigger |
| Native iOS / Android apps | DEFERRED Phase 8 |
| Open API ecosystem | DEFERRED Phase 8 |
| Full APM (Datadog/New Relic replacement) | Not planned |
| Marketplace integrations | DEFERRED Phase 8 |

---

*HOSTYLLO Feature Map v15.0 · Zeerak Hostix · May 2026 · Confidential*
*All features trace to MASTER PRD v15.0. If a feature has no FR-ID, it is not built.*
*Merged from: Set A v13 FR-ID system + Set B v14 emoji priority system.*
