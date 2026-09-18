# CampusFix System Architecture

CampusFix is a production-grade university campus infrastructure issue reporting, facilities tracking, and incident triage platform.

---

## 1. High-Level Architectural Overview

CampusFix is built upon the Next.js 14 App Router full-stack paradigm, combining React Server Components (RSC), Client Components with granular state subscriptions via Zustand, authenticated Server Actions and Route Handlers, role-based access control (RBAC), Prisma ORM with PostgreSQL, and transactional email processing powered by Resend and React Email.

```mermaid
graph TD
    Client["Browser / Client (React 18 + Next.js App Router)"]
    
    subgraph Presentation ["Presentation & UI Layer"]
        RSC["React Server Components (Direct DB Fetching)"]
        CC["Client Components (Zustand State, Theme, Reactive UI)"]
        Particle["WebGL Particle Drift (Auth Experience)"]
        Cmd["Command Palette & Shortcuts (Cmd+K, /)"]
    end

    subgraph Security ["Authentication & Authorization"]
        BA["Better Auth Session Management"]
        RBAC["Role-Based Access Control (Admin / Member / Guest)"]
        Middleware["Next.js Route Middleware / Proxy Guard"]
    end

    subgraph Backend ["Application & Mutation Layer"]
        SA["Server Actions ('use server')"]
        RH["Route Handlers (/api/*)"]
        Zod["Shared Zod Validation Schemas"]
    end

    subgraph Persistence ["Data & Logging"]
        Prisma["Prisma ORM Client"]
        PG[("PostgreSQL Database")]
        Audit["Audit Log Trail"]
        History["Issue Status History"]
    end

    subgraph TransactionalEmail ["Notification Pipeline"]
        ReactEmail["React Email Templates"]
        ResendAPI["Resend REST API"]
        WebhookHandler["Resend Webhook Handler (/api/webhooks/resend)"]
        EmailPersistence["Email Delivery Persistence"]
    end

    Client --> RSC
    Client --> CC
    CC --> SA
    CC --> RH
    
    SA --> Zod
    SA --> BA
    SA --> RBAC
    RH --> BA
    RH --> RBAC
    
    SA --> Prisma
    RH --> Prisma
    RSC --> Prisma
    
    Prisma --> PG
    
    SA --> Audit
    SA --> History
    SA --> ReactEmail
    
    ReactEmail --> ResendAPI
    ResendAPI -.->|Async Delivery Event| WebhookHandler
    WebhookHandler --> Prisma
    Prisma --> EmailPersistence
```

---

## 2. End-to-End Mutation & Event Flow

Every operational change in CampusFix (such as issue reporting, status triage, and technician assignment) follows an authoritative server-validated pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Facilities Admin
    participant UI as Client UI (React Form / Selector)
    participant Action as Server Action (e.g. updateIssueStatusAction)
    participant Auth as Better Auth & RBAC Check
    participant DB as PostgreSQL via Prisma
    participant Email as React Email + Resend
    participant Webhook as /api/webhooks/resend

    User->>UI: Submit Action (e.g. Update status to IN_PROGRESS)
    UI->>Action: Invoke Server Action with payload
    Action->>Auth: Verify user session and required role (ADMIN)
    Auth-->>Action: Authorized (admin context verified)
    
    rect rgb(240, 248, 255)
        note over Action,DB: Database Transaction
        Action->>DB: Update Issue status
        Action->>DB: Insert IssueStatusHistory entry
        Action->>DB: Record AuditLog (Actor, Action, Object, Change)
    end
    
    opt If status updated to IN_PROGRESS or RESOLVED
        Action->>DB: Create EmailDelivery record (status: QUEUED)
        Action->>Email: Render React Email template & dispatch to Resend
        Email-->>Action: Dispatched (external ID returned)
        Action->>DB: Update EmailDelivery record (status: SENT)
    end
    
    Action-->>UI: Return typed action result { success: true, message: ... }
    UI->>User: Toast notification & optimistic/reactive state update
    
    opt Asynchronous Delivery Webhook
        Email-->>Webhook: Delivery/Bounce Event payload + Svix Signature
        Webhook->>Webhook: Verify signature & idempotency key
        Webhook->>DB: Update EmailDelivery (status: DELIVERED / BOUNCED)
    end
```

---

## 3. Core Subsystems

### 3.1 Authentication & Role-Based Authorization
- **Better Auth Integration**: Authoritative session management backed by PostgreSQL tables (`user`, `session`, `account`, `verification`).
- **Roles**:
  - `GUEST`: Read-only access to public directory; can inspect public issues.
  - `MEMBER`: Full reporting capabilities; ability to view personal reported issues (`viewScope: "mine"`).
  - `ADMIN`: Full facilities administration, triage, technician assignment, role promotion/demotion, audit trail inspection, and email delivery telemetry.
- **Server Guard**: `getServerSession()` verifies active session tokens server-side before any administrative action or page render executes.

### 3.2 Relational Data Models (Prisma & PostgreSQL)
- **User**: Authentication identity, assigned operational role (`ADMIN`, `MEMBER`, `GUEST`), timestamps.
- **Issue**: Campus infrastructure reports with `referenceCode` (e.g. `CFX-XXXX`), `title`, `description`, `category`, `priority` (`HIGH`, `MEDIUM`, `LOW`), `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`), `location`, reporter reference, and optional assignee reference.
- **IssueStatusHistory**: Complete append-only timeline of every status transition with timestamp, transition metadata, and actor note.
- **AuditLog**: Authoritative audit trail recording who performed what action, targeting which entity, with delta change tracking.
- **EmailDelivery**: Complete log of transactional email dispatches, tracking recipient, subject, event, external provider ID, and delivery state (`QUEUED`, `SENT`, `DELIVERED`, `BOUNCED`, `FAILED`).

### 3.3 Transactional Email & Webhook Processing
- **Email Dispatch**: Triggered on incident resolution or assignment updates using React Email templates (`IssueResolvedEmail`, `IssueAssignmentEmail`).
- **Resend Webhooks**: Endpoint `/api/webhooks/resend` validates cryptographic Svix webhook signatures, guarantees idempotent message processing, and updates database delivery states in real-time.
