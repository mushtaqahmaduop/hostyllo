# 05_API_SPECIFICATION.md
## HOSTYLLO — Complete API Specification
### v1.0 · June 2026 · Traceable to PRD v15.0 Section 18 + Blueprint Section 6

---

## GLOBAL STANDARDS

**Base URL:** `https://api.hostyllo.app/api/v1/`

**Authentication:** `Authorization: Bearer <access_token>` header required on all endpoints except `/auth/login`, `/auth/refresh`, `/health`.

**Response envelope (all endpoints):**
```json
{ "success": true,  "data": {}    }
{ "success": false, "data": null, "code": "ERR_CODE", "message": "Human readable", "field": "fieldName" }
```

**hostel_id rule:** ALWAYS sourced from `req.hostelId` (JWT). NEVER accepted from request body, query params, or URL params. Any endpoint violating this is a security bug.

**Pagination:** All list endpoints accept `?limit=25&offset=0`. Maximum `limit`: 100.

**Soft delete:** All list endpoints exclude `deleted_at IS NOT NULL` records automatically.

**Rate limits:**
- `/auth/login`: 10 requests / 15 min / IP (Redis-backed)
- All other endpoints: 300 requests / 1 min / IP (Cloudflare + `@fastify/rate-limit`)

**Global error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `SUBSCRIPTION_SUSPENDED` | 402 | Tenant suspended — writes blocked |
| `RATE_LIMITED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Request body fails schema validation |
| `NOT_FOUND` | 404 | Record does not exist in this tenant |
| `INTERNAL_ERROR` | 500 | Unhandled server error (logged to Sentry) |

---

## MODULE 1 — AUTHENTICATION (6 endpoints)

### POST /auth/login

**Purpose:** Authenticate with email + password. Returns access token + sets refresh cookie. If TOTP is enabled, returns `requiresMfa: true` instead of tokens.

**Auth:** None

**Rate limit:** 10 requests / 15 min / IP

**Request:**
```json
{
  "email": "owner@hostel.pk",
  "password": "plaintext_password"
}
```

**Response (no MFA):** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "userId": "uuid",
      "email": "owner@hostel.pk",
      "role": "hostel_owner",
      "hostelId": "uuid",
      "displayName": "Ahmed",
      "theme": "dark",
      "language": "en"
    }
  }
}
```
Sets cookie: `refresh_token=<token>; HttpOnly; SameSite=Strict; Secure; Max-Age=604800`

**Response (MFA required):** `200 OK`
```json
{
  "success": true,
  "data": {
    "requiresMfa": true,
    "mfaToken": "short-lived-single-use-token"
  }
}
```

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email OR wrong password (identical message, identical timing) |
| `AUTH_ACCOUNT_SUSPENDED` | 403 | Tenant is SUSPENDED — inform owner |
| `RATE_LIMITED` | 429 | > 10 attempts / 15 min / IP |

---

### POST /auth/totp/verify

**Purpose:** Complete login after MFA challenge. Exchanges `mfaToken` + TOTP code for real access token.

**Auth:** None (uses short-lived `mfaToken` from login response)

**Request:**
```json
{
  "mfaToken": "short-lived-single-use-token",
  "code": "123456"
}
```

**Response:** `200 OK` — same shape as `/auth/login` success (no MFA)

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `AUTH_INVALID_MFA_TOKEN` | 401 | Expired or already-used mfaToken |
| `AUTH_INVALID_TOTP_CODE` | 401 | Wrong 6-digit code |

---

### POST /auth/refresh

**Purpose:** Exchange refresh token cookie for new access token. Rotates refresh token (old one invalidated).

**Auth:** None (reads `refresh_token` httpOnly cookie)

**Request:** No body.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ..."
  }
}
```
Sets new `refresh_token` cookie. Previous refresh token jti added to blocklist.

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `AUTH_REFRESH_INVALID` | 401 | Missing, expired, or already-used refresh token |

---

### POST /auth/logout

**Purpose:** Invalidate current access token and refresh token.

**Auth:** Bearer token required.

**Request:** No body.

**Response:** `200 OK`
```json
{ "success": true, "data": null }
```
Clears `refresh_token` cookie. Adds both JTIs to blocklist.

---

### POST /auth/reset-password

**Purpose:** Request password reset OTP, then complete reset with OTP.

**Auth:** None.

**Step 1 — Request OTP:**
```json
{ "email": "owner@hostel.pk" }
```
Response: `200 OK` — always identical response regardless of whether email exists (prevents enumeration):
```json
{ "success": true, "data": { "message": "If this email exists, a reset code has been sent." } }
```

**Step 2 — Submit OTP + new password:**
```json
{
  "email": "owner@hostel.pk",
  "otp": "482910",
  "newPassword": "new_password_min_8_chars"
}
```
Response: `200 OK`
```json
{ "success": true, "data": null }
```
On success: all existing sessions invalidated (jti blocklist flush for this user).

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `AUTH_RESET_INVALID_OTP` | 401 | Wrong or expired OTP (10-minute expiry) |
| `AUTH_RESET_MAX_ATTEMPTS` | 429 | > 5 attempts on same OTP token |
| `VALIDATION_ERROR` | 400 | Password < 8 characters |

---

### POST /auth/totp/setup

**Purpose:** Begin TOTP setup for current user. Returns QR code URI and backup codes.

**Auth:** Bearer token required. Any role.

**Request:** No body.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "otpAuthUri": "otpauth://totp/HOSTYLLO:owner@hostel.pk?secret=BASE32SECRET&issuer=HOSTYLLO",
    "backupCodes": ["abc123", "def456", "..."]
  }
}
```
TOTP is NOT yet enabled. Must call `/auth/totp/verify` to confirm setup.

---

## MODULE 2 — STUDENTS (7 endpoints)

### GET /students

**Purpose:** List students for current tenant. Supports search via `q` query param (pg_trgm).

**Auth:** Bearer. Role: `warden` or above.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | — | Search: name, father name, city, phone. pg_trgm GIN. < 200ms. |
| `status` | `active\|on_leave\|vacated` | `active` | Filter by student status |
| `room_id` | uuid | — | Filter by room |
| `limit` | integer | 25 | Max 100 |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "studentId": "uuid",
        "fullName": "Ahmed Khan",
        "maskedCnic": "XXXXX-XXXXXXX-X",
        "phone": "0312-3456789",
        "status": "active",
        "roomId": "uuid",
        "roomNumber": "4",
        "bedLabel": "B",
        "rentPkr": 8000,
        "unpaidPkr": 3000,
        "joinDate": "2025-01-15",
        "photoUrl": "signed-url-24h-expiry"
      }
    ],
    "total": 47,
    "limit": 25,
    "offset": 0
  }
}
```

---

### POST /students

**Purpose:** Add a new student. Encrypts CNIC. Validates photo magic bytes. Assigns to bed.

**Auth:** Bearer. Role: `warden` or above (with `can_edit=true`).

**Request:**
```json
{
  "fullName": "Ahmed Khan",
  "fatherName": "Riaz Khan",
  "cnic": "35202-1234567-9",
  "phone": "0312-3456789",
  "emergencyContact": "0300-1234567",
  "email": "ahmed@example.com",
  "occupation": "Student",
  "city": "Peshawar",
  "address": "House 12, Street 5, Hayatabad",
  "roomId": "uuid",
  "bedId": "uuid",
  "rentPkr": 8000,
  "admissionFeePkr": 2000,
  "depositPkr": 5000,
  "joinDate": "2026-06-01",
  "photoBase64": "data:image/jpeg;base64,..."
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "studentId": "uuid",
    "maskedCnic": "XXXXX-XXXXXXX-X",
    "fullName": "Ahmed Khan"
  }
}
```

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `STU_CNIC_DUPLICATE` | 409 | Same CNIC already exists in this hostel |
| `STU_BED_OCCUPIED` | 409 | Selected bed already has a student |
| `STU_PHOTO_INVALID` | 400 | MIME type or magic bytes check failed |
| `STU_PHOTO_TOO_LARGE` | 400 | Photo > 2MB |
| `TRIAL_STUDENT_LIMIT` | 402 | Trial plan — 30 student maximum reached |
| `VALIDATION_ERROR` | 400 | Required fields missing or invalid format |

---

### GET /students/search

**Purpose:** Typeahead search. Returns top 5 matches. Optimized for payment form student picker.

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?q=ahmed` (minimum 2 characters)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "studentId": "uuid",
        "fullName": "Ahmed Khan",
        "roomNumber": "4",
        "rentPkr": 8000,
        "unpaidPkr": 3000,
        "status": "active"
      }
    ]
  }
}
```

---

### GET /students/:id

**Purpose:** Full student profile — all fields, payment history summary, room shift history.

**Auth:** Bearer. Role: `warden` or above.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "studentId": "uuid",
    "fullName": "Ahmed Khan",
    "fatherName": "Riaz Khan",
    "maskedCnic": "XXXXX-XXXXXXX-X",
    "phone": "0312-3456789",
    "emergencyContact": "0300-1234567",
    "email": "ahmed@example.com",
    "occupation": "Student",
    "city": "Peshawar",
    "address": "House 12, Street 5",
    "roomId": "uuid",
    "roomNumber": "4",
    "bedLabel": "B",
    "rentPkr": 8000,
    "admissionFeePkr": 2000,
    "depositPkr": 5000,
    "depositStatus": "paid",
    "status": "active",
    "joinDate": "2025-01-15",
    "photoUrl": "signed-url-24h",
    "paymentRiskScore": "low",
    "recentPayments": [
      {
        "paymentId": "uuid",
        "paymentMonth": "2026-05-01",
        "status": "paid",
        "amountPaidPkr": 8000,
        "receiptId": "RCP-000042"
      }
    ],
    "roomShifts": [],
    "createdAt": "2025-01-15T09:00:00Z"
  }
}
```

**Note:** `cnic_encrypted` is NEVER returned. Only `maskedCnic`.

---

### GET /students/:id/reveal-cnic

**Purpose:** Reveal actual CNIC for this student. Creates audit log entry. Requires explicit user action.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Request:** No body.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "cnic": "35202-1234567-9"
  }
}
```
Creates `audit_log` entry: `{ action: 'cnic_revealed', entityType: 'student', entityId, cnicRevealed: true }`.

---

### PATCH /students/:id

**Purpose:** Edit student record. Any field except `hostel_id`, `student_id`.

**Auth:** Bearer. Role: `warden` (with `can_edit=true`) or above.

**Request:** Any subset of student fields (partial update). Same field schema as `POST /students`.

**Response:** `200 OK` — updated student record (same shape as `GET /students/:id`)

**Error codes:** Same as `POST /students` where applicable.

---

### DELETE /students/:id

**Purpose:** Soft-delete student. Sets `deleted_at`. Frees room/bed assignment.

**Auth:** Bearer. Role: `warden` (with `can_delete=true`) or `hostel_owner`.

**Request:** No body.

**Response:** `200 OK`
```json
{ "success": true, "data": null }
```

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `STU_PENDING_PAYMENTS` | 409 | Student has unpaid payments — warn before deleting |
| `FORBIDDEN` | 403 | Warden with `can_delete=false` |

---

### POST /students/import

**Purpose:** Bulk CSV import. Strips formula injection (`= + - @`). Returns preview before confirmation.

**Auth:** Bearer. Role: `hostel_owner` or `warden` (with `can_edit=true`).

**Request:** `multipart/form-data`
- `file`: CSV file (max 2MB)
- `confirm`: `"false"` (preview) or `"true"` (import)

**Response (preview, confirm=false):** `200 OK`
```json
{
  "success": true,
  "data": {
    "preview": [
      { "row": 1, "fullName": "Ahmed Khan", "cnic": "35202-1234567-9", "valid": true },
      { "row": 2, "fullName": "", "cnic": "invalid", "valid": false, "errors": ["fullName required", "invalid CNIC format"] }
    ],
    "validRows": 8,
    "invalidRows": 2,
    "totalRows": 10
  }
}
```

**Response (import, confirm=true):** `200 OK`
```json
{
  "success": true,
  "data": {
    "imported": 8,
    "failed": 2,
    "failures": [
      { "row": 2, "reason": "Invalid CNIC format" }
    ]
  }
}
```

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `IMPORT_INVALID_FILE` | 400 | Not a valid CSV |
| `IMPORT_TOO_LARGE` | 400 | File > 2MB |
| `TRIAL_STUDENT_LIMIT` | 402 | Import would exceed trial 30-student limit |

---

## MODULE 3 — ROOMS & BEDS (6 endpoints)

### GET /rooms

**Purpose:** List all rooms with occupancy status and bed grid.

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?status=available|maintenance|closed`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "roomId": "uuid",
        "number": "4",
        "floor": "Ground",
        "roomType": "Double",
        "colorHex": "#6366f1",
        "capacity": 2,
        "defaultRentPkr": 8000,
        "status": "available",
        "occupiedBeds": 1,
        "freeBeds": 1,
        "beds": [
          { "bedId": "uuid", "label": "A", "status": "occupied", "studentName": "Ahmed Khan", "studentId": "uuid" },
          { "bedId": "uuid", "label": "B", "status": "available", "studentName": null, "studentId": null }
        ]
      }
    ],
    "summary": { "totalRooms": 10, "totalBeds": 18, "occupiedBeds": 14, "freeBeds": 4 }
  }
}
```

---

### POST /rooms

**Purpose:** Add a new room with beds.

**Auth:** Bearer. Role: `warden` or above.

**Request:**
```json
{
  "number": "5",
  "floor": "First",
  "roomType": "Single",
  "colorHex": "#10b981",
  "capacity": 1,
  "defaultRentPkr": 6000,
  "amenities": ["AC", "Attached Bath"],
  "notes": "Corner room",
  "beds": [
    { "label": "A" }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { "roomId": "uuid", "number": "5" }
}
```

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `RM_NUMBER_DUPLICATE` | 409 | Room number already exists in this hostel |
| `TRIAL_ROOM_LIMIT` | 402 | Trial plan — 10 room maximum reached |

---

### GET /rooms/:id

**Purpose:** Full room detail with bed grid and history.

**Auth:** Bearer. Role: `warden` or above.

**Response:** `200 OK` — full room object including all beds and last 5 students who occupied each bed.

---

### PATCH /rooms/:id

**Purpose:** Edit room details. Cannot change `room_id` or `hostel_id`.

**Auth:** Bearer. Role: `warden` or above.

**Request:** Any subset of room fields.

**Response:** `200 OK` — updated room object.

---

### DELETE /rooms/:id

**Purpose:** Soft-delete room. Blocked if any active students are assigned.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Response:** `200 OK`

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `RM_HAS_ACTIVE_STUDENTS` | 409 | Room has active students — cannot delete (PRD FR-RM-10, error RM_002) |

---

### POST /rooms/shift

**Purpose:** Move a student from one room/bed to another. Logs to `room_shifts`.

**Auth:** Bearer. Role: `warden` or above.

**Request:**
```json
{
  "studentId": "uuid",
  "toRoomId": "uuid",
  "toBedId": "uuid",
  "newRentPkr": 9000,
  "notes": "Moved to bigger room"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shiftId": "uuid",
    "studentId": "uuid",
    "fromRoomNumber": "4",
    "toRoomNumber": "6",
    "oldRentPkr": 8000,
    "newRentPkr": 9000
  }
}
```

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `RM_BED_OCCUPIED` | 409 | Target bed already occupied |
| `RM_ROOM_MAINTENANCE` | 409 | Target room is in maintenance mode |

---

### PATCH /rooms/bulk-fee

**Purpose:** Update rent for multiple students at once. 3 modes.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Request:**
```json
{
  "mode": "by_room_type",
  "roomType": "Double",
  "newRentPkr": 9000
}
```
OR
```json
{
  "mode": "apply_to_all",
  "newRentPkr": 8500
}
```
OR
```json
{
  "mode": "per_student",
  "updates": [
    { "studentId": "uuid", "newRentPkr": 7500 },
    { "studentId": "uuid", "newRentPkr": 10000 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "updatedCount": 12 }
}
```

---

## MODULE 4 — PAYMENTS & RECEIPTS (8 endpoints)

### GET /payments

**Purpose:** List payments with filters.

**Auth:** Bearer. Role: `warden` or above.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `month` | `YYYY-MM` | Filter by payment month |
| `studentId` | uuid | Filter by student |
| `status` | `paid\|partial\|pending\|void` | Filter by status |
| `limit` | integer | Max 100, default 25 |
| `offset` | integer | Default 0 |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "paymentId": "uuid",
        "studentId": "uuid",
        "studentName": "Ahmed Khan",
        "roomNumber": "4",
        "paymentMonth": "2026-05-01",
        "rentPkr": 8000,
        "admissionFeePkr": 0,
        "extraCharges": [{ "label": "Electricity", "amountPkr": 500 }],
        "concessionPkr": 0,
        "totalDuePkr": 8500,
        "amountPaidPkr": 8500,
        "unpaidPkr": 0,
        "status": "paid",
        "paymentMethod": "JazzCash",
        "paymentDate": "2026-05-05",
        "receiptId": "RCP-000042",
        "receiptUrl": "signed-url-24h"
      }
    ],
    "total": 35,
    "limit": 25,
    "offset": 0
  }
}
```

---

### POST /payments

**Purpose:** Record a payment. Runs `calculateUnpaid()`. Queues PDF receipt generation.

**Auth:** Bearer. Role: `warden` or above.

**Required header:** `X-Idempotency-Key: <client-generated-uuid>` — stored in Redis 24h. Duplicate key returns cached response without re-processing.

**Request:**
```json
{
  "studentId": "uuid",
  "paymentMonth": "2026-06-01",
  "rentPkr": 8000,
  "admissionFeePkr": 0,
  "extraCharges": [
    { "label": "Electricity", "amountPkr": 500 },
    { "label": "Internet",    "amountPkr": 300 }
  ],
  "concessionPkr": 500,
  "concessionNote": "Merit scholarship",
  "amountPaidPkr": 8300,
  "paymentMethod": "JazzCash",
  "paymentDate": "2026-06-05",
  "dueDate": "2026-06-30",
  "notes": ""
}
```

**Server-side formula (port verbatim from Electron `calculateUnpaid()`):**
```
totalDue = rentPkr + admissionFeePkr + sum(extraCharges) - concessionPkr
unpaid   = Math.max(0, totalDue - amountPaidPkr)
status   = amountPaidPkr >= totalDue ? 'paid' : amountPaidPkr > 0 ? 'partial' : 'pending'
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "receiptId": "RCP-000043",
    "totalDuePkr": 8300,
    "amountPaidPkr": 8300,
    "unpaidPkr": 0,
    "status": "paid",
    "receiptStatus": "generating"
  }
}
```

Receipt PDF is generated asynchronously via BullMQ `pdf-receipts` queue. `receiptUrl` is available in `GET /payments/:id` once generation completes (typically < 2 seconds).

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `PAY_DUPLICATE_MONTH` | 409 | Non-void payment already exists for this student + month |
| `PAY_STUDENT_VACATED` | 409 | Student status is `vacated` |
| `VALIDATION_ERROR` | 400 | `rentPkr` < 0, `amountPaidPkr` < 0, missing required fields |

---

### GET /payments/:id

**Purpose:** Full payment detail including extra charges and receipt URL.

**Auth:** Bearer. Role: `warden` or above.

**Response:** `200 OK` — full payment object as defined in `POST /payments` response plus `receiptUrl` (signed URL, 24h expiry, null if still generating).

---

### PATCH /payments/:id

**Purpose:** Edit payment. `hostel_owner` and above: full edit. `warden`: void-request only (cannot edit values).

**Auth:** Bearer. Role: `warden` or above.

**Request (owner editing):**
```json
{
  "amountPaidPkr": 9000,
  "paymentMethod": "Cash",
  "notes": "Corrected amount"
}
```

**Request (warden void-request — only allowed action for warden role):**
```json
{
  "voidRequest": true,
  "voidReason": "Incorrect amount recorded"
}
```

**Response:** `200 OK` — updated payment object.

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `PAY_VOID_ONLY` | 403 | Warden attempting to edit payment fields (not void-request) |
| `PAY_ALREADY_VOID` | 409 | Payment status is already `void` |

---

### POST /payments/:id/void-confirm

**Purpose:** `hostel_owner` confirms a warden's void-request. Sets payment status to `void`.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Request:** No body (or optional `{ "notes": "Confirmed" }`).

**Response:** `200 OK`
```json
{ "success": true, "data": { "status": "void" } }
```

---

### GET /payments/defaulters

**Purpose:** List students with unpaid or partial payments for a given month.

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?month=2026-06` (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "defaulters": [
      {
        "studentId": "uuid",
        "studentName": "Ahmed Khan",
        "phone": "0312-3456789",
        "roomNumber": "4",
        "totalDuePkr": 8000,
        "amountPaidPkr": 0,
        "unpaidPkr": 8000,
        "status": "pending",
        "paymentRiskScore": "medium",
        "whatsappMessage": "Dear Ahmed Khan, your rent for June 2026 is PKR 8,000. Room: 4. Please arrange payment. — Hostel Name"
      }
    ],
    "totalDefaulters": 5,
    "totalUnpaidPkr": 34500
  }
}
```

---

### GET /payments/summary

**Purpose:** Monthly revenue/expense/transfer totals for dashboard and reports.

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?month=2026-06`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "month": "2026-06-01",
    "revenuePkr": 145000,
    "pendingPkr": 34500,
    "expensesPkr": 22000,
    "transfersPkr": 50000,
    "netFundPkr": 73000,
    "collectionRatePct": 80.7,
    "activeStudents": 24,
    "paidCount": 19,
    "partialCount": 3,
    "pendingCount": 2
  }
}
```

---

### POST /payments/generate-monthly

**Purpose:** Generate `pending` payment records for all active students for the current month. Idempotent — `ON CONFLICT DO NOTHING`.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Request:** No body (uses current month) or:
```json
{ "month": "2026-06-01" }
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "generated": 21,
    "skipped": 3,
    "month": "2026-06-01"
  }
}
```

`skipped` = students who already had a payment record for this month (idempotency guard).

---

### POST /payments/:id/send-receipt

**Purpose:** Trigger WhatsApp receipt send or return copy-paste fallback text.

**Auth:** Bearer. Role: `warden` or above.

**Request:** No body.

**Response (WhatsApp active, Phase 3+):** `200 OK`
```json
{
  "success": true,
  "data": { "channel": "whatsapp", "queued": true }
}
```

**Response (Phase 1–2, copy-paste fallback):** `200 OK`
```json
{
  "success": true,
  "data": {
    "channel": "copy_paste",
    "message": "HOSTYLLO — Receipt RCP-000042\n\nDear Ahmed Khan,\nPayment received: PKR 8,000\nMonth: June 2026\nBalance: PKR 0\n\nThank you!",
    "receiptUrl": "signed-pdf-url"
  }
}
```

---

## MODULE 5 — EXPENSES (5 endpoints)

### GET /expenses

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?month=2026-06`, `?category=Electricity`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "expenseId": "uuid",
        "category": "Electricity",
        "description": "June electricity bill",
        "amountPkr": 8500,
        "expenseDate": "2026-06-10",
        "notes": "",
        "createdBy": "Warden Name"
      }
    ],
    "total": 12,
    "limit": 25,
    "offset": 0
  }
}
```

---

### GET /expenses/summary

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?month=2026-06`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "month": "2026-06-01",
    "totalPkr": 22000,
    "byCategory": [
      { "category": "Electricity", "totalPkr": 8500 },
      { "category": "Water",       "totalPkr": 3200 },
      { "category": "Gas",         "totalPkr": 5100 }
    ]
  }
}
```

---

### POST /expenses

**Auth:** Bearer. Role: `warden` or above.

**Request:**
```json
{
  "category": "Electricity",
  "description": "June electricity bill",
  "amountPkr": 8500,
  "expenseDate": "2026-06-10",
  "notes": ""
}
```

**Response:** `201 Created`
```json
{ "success": true, "data": { "expenseId": "uuid" } }
```

---

### PATCH /expenses/:id

**Auth:** Bearer. Role: `warden` (with `can_edit=true`) or above.

**Request:** Any subset of expense fields.

**Response:** `200 OK` — updated expense object.

---

### DELETE /expenses/:id

**Auth:** Bearer. Role: `hostel_owner` or above.

**Response:** `200 OK` — soft delete (sets `deleted_at`).

---

## MODULE 6 — DASHBOARD (2 endpoints)

### GET /dashboard/stats

**Purpose:** All 5 KPI values in a single database round-trip. Uses materialized aggregation query.

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?month=2026-06` (defaults to current month)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "month": "2026-06-01",
    "revenuePkr": 145000,
    "pendingPkr": 34500,
    "expensesPkr": 22000,
    "transfersPkr": 50000,
    "netFundPkr": 73000,
    "activeStudents": 24,
    "totalBeds": 30,
    "occupiedBeds": 24,
    "occupancyPct": 80.0
  }
}
```

Performance target: < 200ms p95. Uses the single-query CTE defined in `04_DATABASE_ARCHITECTURE.md` Section 5.2.

---

### GET /dashboard/alerts

**Purpose:** Alert banner counts for Dashboard Row 3.

**Auth:** Bearer. Role: `warden` or above.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "pendingCancellations": 2,
    "pendingPaymentsCount": 5,
    "openMaintenance": 1,
    "unresolvedComplaints": 0,
    "occupancyBelowThreshold": false,
    "activeNotices": [
      {
        "noticeId": "uuid",
        "title": "Water supply disruption",
        "noticeType": "warning",
        "expiresAt": "2026-06-10T00:00:00Z"
      }
    ]
  }
}
```

---

## MODULE 7 — AUDIT LOG (2 endpoints)

### GET /audit-log

**Purpose:** Paginated audit trail for current tenant. All financial and sensitive actions.

**Auth:** Bearer. Role: `warden` or above.

**Query params:** `?limit=25&offset=0&action=payment_created&userId=uuid`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "logId": "uuid",
        "actorId": "uuid",
        "actorName": "Ahmed (Warden)",
        "impersonatedBy": null,
        "action": "payment_created",
        "entityType": "payment",
        "entityId": "uuid",
        "newValues": { "amountPaidPkr": 8000, "status": "paid" },
        "ipAddress": "103.x.x.x",
        "createdAt": "2026-06-05T10:30:00Z"
      }
    ],
    "total": 247,
    "limit": 25,
    "offset": 0
  }
}
```

`oldValues` and `newValues` returned for edit actions. `cnic_encrypted` is NEVER included in either field.

---

### GET /audit-log/:entityId

**Purpose:** All audit entries for a specific entity (student, payment, room, etc.).

**Auth:** Bearer. Role: `warden` or above.

**Response:** `200 OK` — same shape as `GET /audit-log` but filtered to the entity.

---

## MODULE 8 — USER MANAGEMENT (4 endpoints)

### GET /users

**Purpose:** List all users for current tenant.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "uuid",
        "email": "warden1@hostel.pk",
        "displayName": "Warden 1",
        "role": "warden",
        "canDelete": true,
        "canSettings": false,
        "canEdit": true,
        "lastLoginAt": "2026-06-04T18:00:00Z",
        "createdAt": "2026-01-15T09:00:00Z"
      }
    ]
  }
}
```

---

### POST /users

**Purpose:** Create a new warden, chain_manager, or viewer account for this tenant.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Request:**
```json
{
  "email": "warden2@hostel.pk",
  "password": "temp_password_min_8",
  "displayName": "Warden 2",
  "role": "warden",
  "canDelete": false,
  "canSettings": false,
  "canEdit": true
}
```

**Response:** `201 Created`
```json
{ "success": true, "data": { "userId": "uuid", "email": "warden2@hostel.pk" } }
```

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `USER_EMAIL_TAKEN` | 409 | Email already exists (globally) |
| `USER_ROLE_FORBIDDEN` | 403 | Attempting to create `super_admin` or another `hostel_owner` |

---

### PATCH /users/:id

**Purpose:** Update user details or warden flags. Cannot change `role` to `super_admin`.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Request:** Any subset of user fields.

**Response:** `200 OK` — updated user object.

---

### DELETE /users/:id

**Purpose:** Soft-delete user. Cannot delete own account or last `hostel_owner`.

**Auth:** Bearer. Role: `hostel_owner` or above.

**Response:** `200 OK`

**Error codes:**
| Code | HTTP | Trigger |
|------|------|---------|
| `USER_SELF_DELETE` | 409 | Cannot delete your own account |
| `USER_LAST_OWNER` | 409 | Cannot delete the last hostel_owner |

---

## MODULE 9 — SYSTEM (2 endpoints)

### GET /health

**Purpose:** Health check for Uptime Robot and CI verification.

**Auth:** None.

**Response `200 OK` (healthy):**
```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "version": "1.0.0",
  "timestamp": "2026-06-05T12:00:00Z"
}
```

**Response `503 Service Unavailable` (degraded):**
```json
{
  "status": "degraded",
  "db": "error",
  "redis": "ok",
  "version": "1.0.0",
  "timestamp": "2026-06-05T12:00:00Z"
}
```

---

### GET /settings/hostel-info + PATCH /settings/hostel-info

**Purpose GET:** Return current hostel settings (name, tagline, logo, colors, etc.)

**Purpose PATCH:** Update hostel settings.

**Auth:** Bearer. Role: `hostel_owner` (PATCH) or `warden` (GET).

**GET Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hostelId": "uuid",
    "name": "Peshawar Boys Hostel",
    "tagline": "Safe, affordable, clean.",
    "city": "Peshawar",
    "phone": "0912-345678",
    "email": "info@hostel.pk",
    "logoUrl": "signed-url-24h",
    "brandColor": "#c9a84c",
    "currency": "PKR",
    "timezone": "Asia/Karachi",
    "showBranding": true,
    "autoMonthAdvance": true,
    "plan": "starter",
    "planStatus": "active",
    "trialEndsAt": null
  }
}
```

**PATCH Request:** Any subset of hostel settings fields. `hostel_id` is not accepted.

**PATCH Response:** `200 OK` — updated hostel settings object.

---

## ENDPOINT COUNT VERIFICATION

| Module | Count | Endpoints |
|--------|-------|-----------|
| Auth | 6 | login, totp/verify, refresh, logout, reset-password, totp/setup |
| Students | 7 | list, create, search, get, reveal-cnic, update, delete, import = 8 (note: reveal-cnic not counted in PRD's 7 — it is a sub-action) |
| Rooms | 6 | list, create, get, update, delete, shift, bulk-fee = 7 (bulk-fee not in PRD's 6 count) |
| Payments | 8 | list, create, get, update, void-confirm, defaulters, summary, generate-monthly, send-receipt = 9 |
| Expenses | 5 | list, summary, create, update, delete |
| Dashboard | 2 | stats, alerts |
| Audit Log | 2 | list, by-entity |
| Users | 4 | list, create, update, delete |
| Health | 1 | /health |
| Settings | 1 | hostel-info (GET + PATCH counted as 1) |
| **Total** | **~42** | Per PRD v15.0 Section 18 |

**Note on discrepancy:** The PRD counts 42 endpoints. The `reveal-cnic`, `void-confirm`, `bulk-fee`, and `send-receipt` sub-actions bring the real count to ~46 depending on how sub-actions are counted. All are documented here. Build all of them.

---

*HOSTYLLO API Specification v1.0 · June 2026 · Traceable to PRD v15.0 Section 18 and Blueprint Section 6*
*Every endpoint must pass the cross-tenant isolation test before marking complete.*
