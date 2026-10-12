# CampusFix — Phase 2B.1: Authentication, Authorization & API Readiness Audit Report

**Date**: 2026-10-12  
**Target Environment**: CampusFix Web Backend (Next.js 14.2 / Better Auth 1.7 / Prisma 5.22 / Neon PostgreSQL)  
**Scope**: Mobile API v1, Shared Service Layer, Authentication & Authorization Paths, Deployment & Security Readiness  

---

## 1. Executive Verdict

### Verdict: **READY (Pending Staging / Live Auth Token Manual Handshake)**

The backend implementation for Phase 2B has successfully introduced the versioned REST API (`/api/v1/`) and shared service layer while preserving all existing website functionality, Server Actions, and security hardening rules.

- **Automated Validation**: 50 tests across 13 suites pass cleanly (`npm test`). TypeScript compilation (`tsc --noEmit`), linting (`next lint`), and production build (`next build`) pass with zero errors and zero warnings.
- **Fail-Closed Security**: Unauthenticated requests, forged bearer tokens, missing sessions, GUEST write operations, and mass-assignment attempts fail closed across all endpoints.
- **Runtime Limitation**: As required by the audit constraints (no writes to production Neon DB), all database interactions in automated tests use isolated test doubles/mocks. The cryptographic HMAC token signature and hook mechanics have been verified, but an end-to-end bearer token login against a live database instance must be verified manually on staging or local environment.

---

## 2. Findings Ranked by Severity

| ID | Title | Severity | Status | Impact Area |
|---|---|---|---|---|
| **F-01** | End-to-End Bearer Token Resolution Unverified on Live DB | **Medium** | Architectural Caveat | Mobile Auth Handshake |
| **F-02** | Edge Middleware Deliberately Bypasses `/api/v1/*` | **Low** | Verified Safe (By Design) | Routing & Middleware |
| **F-03** | Issue Detail Lookup Accepts CUID Only (Not Reference Code) | **Low** | Documented Limitation | Issue Details API |
| **F-04** | Role-Aware PII Redaction Verified Across DTOs | **Informational** | Fully Verified | Privacy & Data Protection |
| **F-05** | Strict Mass Assignment Guard on Administrative PATCH | **Informational** | Fully Verified | Authorization & Security |
| **F-06** | Atomic Transactions & Bounded Query Limits Enforced | **Informational** | Fully Verified | Data Integrity & Performance |

---

## 3. Detailed Technical Findings & Code Trace

### Finding F-01: End-to-End Bearer Token Resolution Unverified on Live DB
- **Severity**: **Medium**
- **File References**:
  - [`lib/auth.ts:28-32`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/auth.ts#L28-L32) (`bearer()` plugin initialization)
  - [`lib/auth/authorization.ts:5-23`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/auth/authorization.ts#L5-L23) (`getServerSession`)
  - [`tests/bearer-auth.test.ts:37-67`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/tests/bearer-auth.test.ts#L37-L67) (Plugin hook tests)
- **Technical Analysis**:
  - Better Auth's `bearer()` plugin intercepts requests to Better Auth's sign-in endpoints (`/api/auth/sign-in/*`, `/api/auth/sign-up/*`). In its `after` hook, when Better Auth creates a session, the plugin extracts the session cookie value and exposes it in the HTTP response header `set-auth-token: <rawToken>.<hmacSignature>`.
  - When the client subsequently supplies `Authorization: Bearer <rawToken>.<hmacSignature>`, the plugin's `before` hook validates the HMAC signature against `BETTER_AUTH_SECRET` and creates a synthetic cookie header `cookie: better-auth.session_token=<token>` in the request context. Better Auth's core then queries the `Session` table in PostgreSQL.
  - In unit tests ([`tests/bearer-auth.test.ts`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/tests/bearer-auth.test.ts)), the HMAC signature validation and cookie header extraction are verified with real cryptographic assertions. In route handler tests ([`tests/api-v1-auth.test.ts`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/tests/api-v1-auth.test.ts)), `auth.api.getSession` is mocked to prevent destructive database queries.
  - **Distinction**: Code inspection and isolated crypto tests confirm the mechanism is valid, but the live connection between Better Auth's internal router and Neon's `session` table cannot be tested without live test database credentials.
- **Recommended Action**: Perform Step 1 in Section 6 (Manual Verification Steps) using a local test database.

---

### Finding F-02: Edge Middleware Deliberately Bypasses `/api/v1/*`
- **Severity**: **Low (Safe by Design)**
- **File References**:
  - [`middleware.ts:81-83`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/middleware.ts#L81-L83) (`config.matcher`)
- **Technical Analysis**:
  - The middleware matcher is configured as:
    ```ts
    export const config = {
      matcher: ["/", "/admin/:path*", "/api/admin/:path*", "/sign-in", "/sign-up"],
    };
    ```
  - `/api/v1/*` routes are excluded from Next.js Edge Middleware.
  - **Verification**: This design is correct and intentional. Edge middleware inspects browser cookies (`campusfix_authorization` or `better-auth.session_token`) for fast edge redirecting. Mobile clients send `Authorization: Bearer <token>` which requires the Better Auth Node.js Prisma adapter to resolve against PostgreSQL.
  - Each route handler in `/api/v1/` independently calls `getServerSession(req.headers)` and performs server-side role and session checks. Unauthenticated requests are rejected with `401 UNAUTHORIZED`.
- **Verdict**: Verified by code inspection and route tests.

---

### Finding F-03: Issue Detail Lookup Accepts CUID Only (Not Reference Code)
- **Severity**: **Low (UX / Ergonomics)**
- **File References**:
  - [`lib/services/issue-service.ts:348-350`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/services/issue-service.ts#L348-L350) (`getIssueById`)
  - [`app/api/v1/issues/[id]/route.ts:33`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/app/api/v1/issues/%5Bid%5D/route.ts#L33)
- **Technical Analysis**:
  - `getIssueById` searches strictly by primary key: `where: { id: issueId }`.
  - In `listIssues`, searching by `referenceCode` (e.g., `CFX-1234`) is supported via the `?search=` parameter. However, `GET /api/v1/issues/[id]` will return `404 NOT_FOUND` if a client passes a reference code instead of the database CUID.
  - While this conforms to standard REST identifier conventions, mobile apps frequently use QR code scanners that encode the reference code rather than the internal CUID.
- **Minimal Fix (Optional / Phase 3)**:
  Update `getIssueById` query condition to allow lookup by either identifier:
  ```ts
  where: {
    OR: [
      { id: issueId },
      { referenceCode: issueId }
    ]
  }
  ```

---

### Finding F-04: Role-Aware PII Redaction Verified Across DTOs
- **Severity**: **Informational (Verified Correct)**
- **File References**:
  - [`lib/services/issue-service.ts:108-135`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/services/issue-service.ts#L108-L135) (`formatIssueDto`)
  - [`tests/api-v1-issues.test.ts:89-114`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/tests/api-v1-issues.test.ts#L89-L114)
- **Technical Analysis**:
  - `formatIssueDto` conditionally includes `createdBy.email` and `assignedTo.email` only if:
    `currentUser.role === UserRole.ADMIN || issue.createdById === currentUser.id`.
  - For all other users (e.g. general students or guests viewing public issues), `email` is omitted from the DTO.
  - Status history entries ([`lib/services/issue-service.ts:138-149`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/services/issue-service.ts#L138-L149)) expose only `id` and `name` of the actor, preventing administrative email leakage.
- **Verdict**: Verified by both static code inspection and automated test assertion.

---

### Finding F-05: Strict Mass Assignment Guard on Administrative PATCH
- **Severity**: **Informational (Verified Correct)**
- **File References**:
  - [`app/api/v1/issues/[id]/route.ts:8-15`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/app/api/v1/issues/%5Bid%5D/route.ts#L8-L15)
  - [`tests/api-v1-issues.test.ts:182-198`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/tests/api-v1-issues.test.ts#L182-L198)
- **Technical Analysis**:
  - `adminUpdateIssueSchema` enforces Zod `.strict()`.
  - Fields such as `title`, `description`, `referenceCode`, `createdById`, or unexpected injection parameters cause parsing to immediately fail with HTTP `400 BAD_REQUEST`.
  - Non-admin callers attempting to invoke `PATCH` are rejected with HTTP `403 FORBIDDEN` before payload parsing or service invocation.
- **Verdict**: Verified by automated negative security tests.

---

### Finding F-06: Atomic Transactions & Bounded Query Limits Enforced
- **Severity**: **Informational (Verified Correct)**
- **File References**:
  - [`lib/services/issue-service.ts:197-243`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/services/issue-service.ts#L197-L243) (`createIssue` transaction)
  - [`lib/services/issue-service.ts:270-273, 319-321`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/services/issue-service.ts#L270-L273) (`listIssues` bounded queries)
  - [`lib/services/issue-service.ts:413-482`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/services/issue-service.ts#L413-L482) (`updateIssueByAdmin` transaction)
- **Technical Analysis**:
  - Issue creation creates the `Issue`, initial `IssueStatusHistory`, and `AuditLog` records in a single atomic `$transaction`. Notification emails are triggered asynchronously outside the transaction to prevent external network latency from aborting database commits.
  - Listing queries clamp `limit` between 1 and 50 (default 20) and `page >= 1`.
  - Queries execute deterministic ordering: `orderBy: [{ createdAt: "desc" }, { id: "desc" }]`.
- **Verdict**: Verified by automated tests and query trace inspection.

---

## 4. Test Quality & Evidence Categorization

| Category | Count | Scope & Isolation | Live Components Exercised |
|---|---|---|---|
| **Cryptographic Unit Tests** | 8 | Tested HMAC-SHA256 bearer signing, header parsing, and JWT tampering in `tests/bearer-auth.test.ts`. | Real `@better-auth/utils/hmac` and `jose` crypto functions. |
| **Logic & Sanitization Unit Tests** | 7 | Input sanitization, XSS escaping, Zod parsing, reference code retry loop in `tests/security-issues.test.ts`. | Pure in-memory unit tests. |
| **Admin Guard Unit Tests** | 3 | Admin self-demotion and last-admin demotion blocks in `tests/admin-security.test.ts`. | Serializable transaction concurrency logic with mock delegates. |
| **Old Route & Action Tests** | 9 | Backward compatibility of `/api/issues` and Server Actions in `tests/api-issues.test.ts`. | Mocked Prisma, real route handler functions. |
| **Mobile v1 Auth Tests** | 4 | `GET /api/v1/auth/me` with missing, invalid, bearer, and cookie sessions in `tests/api-v1-auth.test.ts`. | Mocked Better Auth, real Next.js route handler. |
| **Mobile v1 Issue Tests** | 19 | Pagination, filters, search, scope, DTO sanitization, GUEST rejection, creation, and PATCH in `tests/api-v1-issues.test.ts`. | Mocked Prisma, real Next.js route handlers. |

### Untested Negative Cases Requiring Future Staging Verification:
1. **Database connection dropout**: Behavior when Neon PostgreSQL drops during an in-flight mobile request.
2. **Expired session revocation**: Mobile request sent 1 second after session deletion in the database.
3. **High-concurrency reference code collision**: 10 simultaneous issue creations colliding on the random 4-digit code.

---

## 5. Website Backward Compatibility Verification

The existing Next.js web application was inspected to ensure zero regressions:
1. **Server Actions**: [`actions/issue-actions.ts`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/actions/issue-actions.ts) and [`actions/admin-actions.ts`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/actions/admin-actions.ts) were kept intact and were not modified during Phase 2B. Web forms continue to use their proven transactional flows and cache revalidations (`revalidatePath`).
2. **Old REST Endpoints**: [`app/api/issues/route.ts`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/app/api/issues/route.ts) and [`app/api/issues/[id]/route.ts`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/app/api/issues/%5Bid%5D/route.ts) maintain their existing response envelope (`{ success: true, count, data }`) and legacy query parameter parsing.
3. **Web Auth Flows**: Email/password, Google OAuth, and GitHub OAuth configurations in [`lib/auth.ts`](file:///c:/Users/shaik/Desktop/A056%20FSTL/Assignments/CampusFix/lib/auth.ts) remain unchanged. Browser sessions and cookie authentications continue to function identically.

---

## 6. Prioritized Manual Verification Steps for Staging / Dev

Before deploying mobile application code, execute these manual steps in a local or staging environment with a test PostgreSQL database:

1. **Step 1: Live Bearer Handshake Test (Priority: High)**
   - Run the dev server locally: `npm run dev`.
   - Send a `POST` request to `/api/auth/sign-in/email` with valid credentials.
   - Verify that the response contains the `set-auth-token` header.
   - Copy the token value and make a `GET` request to `http://localhost:3000/api/v1/auth/me` with `Authorization: Bearer <token>`.
   - Verify that HTTP `200` is returned with the authenticated user profile.
2. **Step 2: Expired / Revoked Token Rejection Test (Priority: High)**
   - Send `POST /api/auth/sign-out` with the bearer token.
   - Immediately replay `GET /api/v1/auth/me` with the same bearer token.
   - Verify that HTTP `401 UNAUTHORIZED` is returned.
3. **Step 3: Netlify Environment Variable Configuration (Priority: Medium)**
   - Verify that Netlify has configured:
     - `DATABASE_URL` (Neon PostgreSQL pooling URL)
     - `BETTER_AUTH_SECRET` (at least 32 characters)
     - `CAMPUSFIX_JWT_SECRET` (at least 32 characters)
     - `BETTER_AUTH_URL` (production domain, e.g., `https://campusfixed.netlify.app`)
     - `RESEND_API_KEY` (production email key)

---

## 7. Execution Compliance Affirmation

In compliance with the mandatory audit constraints:
- **No Git commands** were executed.
- **No browser or manual UI QA** was performed.
- **No production database operations** were run against Neon (no migrations, no writes, no reads of production secrets).
- **No Flutter code or repository** was created.
- **All automated checks** reported actual command outputs (`npm test`: 50 passed, `tsc`: 0 errors, `lint`: 0 warnings, `build`: compiled).
