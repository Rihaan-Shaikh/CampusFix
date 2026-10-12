# CampusFix — Mobile API Specification (v1)

This document specifies the initial versioned REST API (`/api/v1/*`) implemented in the CampusFix backend for native mobile applications (such as the upcoming Flutter client).

---

## 1. Overview & Architecture

- **Base URL**: `https://<domain>/api/v1`
- **Protocol**: HTTPS only
- **Data Format**: JSON (`Content-Type: application/json`, `Accept: application/json`)
- **Authentication**: Better Auth Session Token via `Authorization: Bearer <token>` or browser session cookies.
- **Data Store**: Neon PostgreSQL via Prisma ORM.

The API is fully decoupled from the Next.js frontend rendering layer while sharing core business logic, input sanitization, database transactions, audit logging, and authorization rules via `lib/services/issue-service.ts`.

---

## 2. Authentication Mechanism

### 2.1 Native Bearer Authentication
Native mobile clients interact with Better Auth endpoints:
1. **Sign In**: Native client calls `POST /api/auth/sign-in/email` with `{ "email": "...", "password": "..." }`.
2. **Token Extraction**: The Better Auth response includes the `set-auth-token` header (exposed via `Access-Control-Expose-Headers`).
   ```http
   set-auth-token: sess_abc123.hmac_signature_value
   ```
3. **Subsequent API Calls**: The mobile client stores this token in secure device storage (e.g., Flutter Secure Storage / Keychain / Keystore) and supplies it on every `/api/v1/*` request:
   ```http
   Authorization: Bearer sess_abc123.hmac_signature_value
   ```
4. **Sign Out**: Native client calls `POST /api/auth/sign-out` with the bearer header. The session is invalidated in PostgreSQL, and subsequent bearer requests are rejected with `401 Unauthorized`.

### 2.2 Cookie Fallback
Web browsers and embedded web views sending `Cookie: better-auth.session_token=...` continue to be authenticated seamlessly without requiring the `Authorization` header.

---

## 3. Standard Response Envelopes

All `/api/v1/*` endpoints return a consistent JSON envelope.

### 3.1 Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```
*Note: `meta` is present on paginated list responses and omitted on single-object responses.*

### 3.2 Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for submitted issue payload",
    "details": {
      "title": ["Title must be at least 5 characters long."]
    }
  }
}
```

### 3.3 HTTP Status Codes
| Code | Meaning | Typical Usage |
|---|---|---|
| `200` | OK | Successful reads (`GET`) and modifications (`PATCH`). |
| `201` | Created | Successful entity creation (`POST`). |
| `400` | Bad Request | Malformed JSON, invalid query parameter, unknown/unauthorized fields. |
| `401` | Unauthorized | Missing, expired, forged, or invalid session token. |
| `403` | Forbidden | Authenticated user lacks sufficient permissions (e.g., GUEST creating issue, non-admin editing issue). |
| `404` | Not Found | Requested entity or target user does not exist. |
| `409` | Conflict | State conflict or concurrency violation. |
| `422` | Unprocessable Entity | Payload failed semantic validation schemas (Zod). |
| `500` | Internal Server Error | Unexpected server exceptions (stack traces are suppressed). |

### 3.4 Error Codes
- `UNAUTHORIZED`: Authentication missing or failed.
- `FORBIDDEN`: Role or permission boundary violated.
- `NOT_FOUND`: Resource or relational dependency not found.
- `BAD_REQUEST`: Invalid URL parameters or unknown fields.
- `VALIDATION_ERROR`: Zod schema validation errors.
- `CONFLICT`: Unique constraint or concurrency race condition.
- `INTERNAL_SERVER_ERROR`: Unhandled internal server exception.

---

## 4. Endpoints

### 4.1 Profile & Authentication State

#### `GET /api/v1/auth/me`
Retrieves current authenticated user's profile and verified role.

- **Authentication**: Required (`Bearer <token>` or session cookie).
- **Permissions**: Any authenticated user (`GUEST`, `MEMBER`, `ADMIN`).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cuid_user_123",
    "name": "Kavya Sharma",
    "email": "kavya@campusfix.local",
    "role": "MEMBER",
    "emailVerified": true,
    "image": null,
    "createdAt": "2026-02-10T14:32:00.000Z"
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Please sign in or provide a valid bearer token."
  }
}
```

---

### 4.2 Issue Listing

#### `GET /api/v1/issues`
Lists campus issues with bounded pagination, multi-field filtering, server-side search, and role-aware PII protection.

- **Authentication**: Required.
- **Permissions**: Any authenticated user (`GUEST`, `MEMBER`, `ADMIN`).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | Integer | No | `1` | Page number (must be >= 1). |
| `limit` | Integer | No | `20` | Items per page (clamped between `1` and `50`). |
| `status` | String | No | — | Filter by status: `OPEN`, `IN_PROGRESS`, `RESOLVED`. |
| `category` | String | No | — | Filter by category: `Classroom Equipment`, `Electrical`, `Network`, `Furniture`, `Cleanliness`, `Laboratory`, `Plumbing`, `Other`. |
| `priority` | String | No | — | Filter by priority: `LOW`, `MEDIUM`, `HIGH`. |
| `search` | String | No | — | Case-insensitive search on `title`, `description`, `location`, `referenceCode`. |
| `scope` | String | No | `all` | `all` (campus-wide) or `mine` (created by or assigned to caller). |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid_issue_001",
      "referenceCode": "CFX-8921",
      "title": "Air conditioning unit leaking water in Lab 302",
      "description": "Continuous water drip over electrical benches.",
      "category": "Electrical",
      "priority": "HIGH",
      "status": "OPEN",
      "location": "Science Block 302",
      "createdAt": "2026-03-01T08:15:00.000Z",
      "updatedAt": "2026-03-01T08:15:00.000Z",
      "resolvedAt": null,
      "createdBy": {
        "id": "cuid_user_123",
        "name": "Kavya Sharma"
      },
      "assignedTo": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```
*PII Redaction Rule: `createdBy.email` and `assignedTo.email` are only returned if the caller is an `ADMIN` or the creator (`createdById === caller.id`).*

---

### 4.3 Issue Creation

#### `POST /api/v1/issues`
Reports a new campus incident. Executes an atomic database transaction creating the issue, initial status history, and audit log record, and queues transactional notification emails.

- **Authentication**: Required.
- **Permissions**: `MEMBER` or `ADMIN`. (`GUEST` accounts are rejected with 403 Forbidden).

**Request Body:**
```json
{
  "title": "Broken corridor lighting in lab annex",
  "category": "Electrical",
  "location": "Science Block Corridor 2",
  "priority": "Medium",
  "description": "Two fluorescent fixtures are flickering continuously since morning."
}
```

**Field Rules:**
- `title`: String, 5–100 chars (trimmed, stripped of HTML/scripts).
- `category`: Must match approved category list.
- `location`: String, 3–80 chars (trimmed).
- `priority`: Enum: `"Low"`, `"Medium"`, `"High"`.
- `description`: String, 15–1000 chars (trimmed, stripped of HTML/scripts).

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "cuid_issue_002",
    "referenceCode": "CFX-4819",
    "title": "Broken corridor lighting in lab annex",
    "description": "Two fluorescent fixtures are flickering continuously since morning.",
    "category": "Electrical",
    "priority": "MEDIUM",
    "status": "OPEN",
    "location": "Science Block Corridor 2",
    "createdAt": "2026-03-05T10:00:00.000Z",
    "updatedAt": "2026-03-05T10:00:00.000Z",
    "resolvedAt": null,
    "createdBy": {
      "id": "cuid_user_123",
      "name": "Kavya Sharma",
      "email": "kavya@campusfix.local"
    },
    "assignedTo": null
  }
}
```

**Error (403 Forbidden - Guest):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Guest accounts have read-only access and cannot submit issues"
  }
}
```

---

### 4.4 Issue Details

#### `GET /api/v1/issues/[id]`
Retrieves full details for a single issue, including chronological status history.

- **Authentication**: Required.
- **Permissions**: Any authenticated user.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cuid_issue_001",
    "referenceCode": "CFX-8921",
    "title": "Air conditioning unit leaking water in Lab 302",
    "description": "Continuous water drip over electrical benches.",
    "category": "Electrical",
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "location": "Science Block 302",
    "createdAt": "2026-03-01T08:15:00.000Z",
    "updatedAt": "2026-03-01T09:30:00.000Z",
    "resolvedAt": null,
    "createdBy": {
      "id": "cuid_user_123",
      "name": "Kavya Sharma"
    },
    "assignedTo": {
      "id": "cuid_staff_007",
      "name": "Ramesh Kumar"
    },
    "statusHistory": [
      {
        "id": "cuid_hist_002",
        "previousStatus": "OPEN",
        "newStatus": "IN_PROGRESS",
        "changedBy": {
          "id": "cuid_staff_007",
          "name": "Ramesh Kumar"
        },
        "note": "HVAC technician dispatched to site.",
        "createdAt": "2026-03-01T09:30:00.000Z"
      },
      {
        "id": "cuid_hist_001",
        "previousStatus": null,
        "newStatus": "OPEN",
        "changedBy": {
          "id": "cuid_user_123",
          "name": "Kavya Sharma"
        },
        "note": "Incident logged by reporter.",
        "createdAt": "2026-03-01T08:15:00.000Z"
      }
    ]
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Issue not found."
  }
}
```

---

### 4.5 Administrative Issue Updates

#### `PATCH /api/v1/issues/[id]`
Allows administrators to update status, priority, assignment, and status notes. Updates are applied atomically with status history and audit logging.

- **Authentication**: Required.
- **Permissions**: `ADMIN` only. (Non-admins receive 403 Forbidden).

**Request Body:**
```json
{
  "status": "RESOLVED",
  "priority": "HIGH",
  "assignedToId": "cuid_staff_007",
  "note": "Replaced drain pipe and tested cooling cycle for 30 minutes."
}
```

*Security Guard: Strict schema rejection is enabled (`z.strict()`). Supplying unauthorized fields (e.g. `title`, `createdById`, `referenceCode`) returns `400 Bad Request` to prevent mass-assignment vulnerabilities.*

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cuid_issue_001",
    "referenceCode": "CFX-8921",
    "title": "Air conditioning unit leaking water in Lab 302",
    "description": "Continuous water drip over electrical benches.",
    "category": "Electrical",
    "priority": "HIGH",
    "status": "RESOLVED",
    "location": "Science Block 302",
    "createdAt": "2026-03-01T08:15:00.000Z",
    "updatedAt": "2026-03-01T11:45:00.000Z",
    "resolvedAt": "2026-03-01T11:45:00.000Z",
    "createdBy": {
      "id": "cuid_user_123",
      "name": "Kavya Sharma",
      "email": "kavya@campusfix.local"
    },
    "assignedTo": {
      "id": "cuid_staff_007",
      "name": "Ramesh Kumar",
      "email": "ramesh@campusfix.local"
    }
  }
}
```

---

## 5. Data Transfer Objects (DTOs)

### `UserSummaryDto`
| Field | Type | Description |
|---|---|---|
| `id` | string | Stable user ID. |
| `name` | string | Full name of the user. |
| `email` | string? | User email (only present if caller is ADMIN or owner). |

### `StatusHistoryItemDto`
| Field | Type | Description |
|---|---|---|
| `id` | string | Unique record ID. |
| `previousStatus` | string? | Previous status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, or `null`). |
| `newStatus` | string | Resulting status. |
| `changedBy` | object | User ID and name of the actor. |
| `note` | string? | Contextual status note or justification. |
| `createdAt` | string | ISO 8601 timestamp. |

### `IssueDto`
| Field | Type | Description |
|---|---|---|
| `id` | string | Internal CUID. |
| `referenceCode` | string | Human-readable identifier (`CFX-XXXX`). |
| `title` | string | Issue title. |
| `description` | string | Detailed issue description. |
| `category` | string | Selected category. |
| `priority` | string | `LOW`, `MEDIUM`, `HIGH`. |
| `status` | string | `OPEN`, `IN_PROGRESS`, `RESOLVED`. |
| `location` | string | Campus location string. |
| `createdAt` | string | ISO 8601 creation timestamp. |
| `updatedAt` | string | ISO 8601 last update timestamp. |
| `resolvedAt` | string? | ISO 8601 resolution timestamp or `null`. |
| `createdBy` | `UserSummaryDto` | Reporting user summary. |
| `assignedTo` | `UserSummaryDto?` | Assigned staff/facility user or `null`. |
| `statusHistory` | `StatusHistoryItemDto[]?` | Chronological transition history (included on details endpoint). |

---

## 6. Known Limitations & Deferred Features

1. **Native OAuth / Social Login**: Better Auth Google/GitHub OAuth flows currently rely on web browser redirection. Native deep-linking / PKCE for mobile OAuth is deferred to Phase 3.
2. **Attachments / Photos**: File uploads for photos/evidence are deferred to Phase 3.
3. **Push Notifications**: Mobile push notifications (FCM / APNs) will be integrated in Phase 4; transactional email confirmation via Resend is currently active.
4. **User Administration Endpoint**: Bulk user role management via REST API is deferred; administrative role management is currently accessible via Next.js Server Actions on the web dashboard.
