# CampusFix — Assignment Alignment Matrix

This document explicitly maps the deliverables of **Assignment 1 (Frontend Architecture & State)** and **Assignment 2 (Full-Stack Relational Systems & Services)** to their exact implementation locations in the CampusFix codebase.

---

## Assignment 1 Deliverables Mapping

| Requirement | Implementation Details | File References |
| :--- | :--- | :--- |
| **Next.js App Router** | Modular layouts, nested route segments, parallel server/client structure | `app/layout.tsx`<br>`app/page.tsx`<br>`app/admin/layout.tsx` |
| **Tailwind CSS & Token System** | Centralized semantic design tokens for Light and Dark modes | `app/globals.css`<br>`tailwind.config.ts` |
| **Theme System (Light Default)** | `next-themes` integration with Light default, dark mode, and system preference | `app/layout.tsx`<br>`components/theme/theme-toggle.tsx` |
| **RSC & Client Separation** | Direct server database fetching in RSCs; minimal client boundary hydration | `app/page.tsx` (RSC)<br>`components/layout/app-shell.tsx` (Client) |
| **Zustand State Store** | Granular subscriptions, search/filter sync, modal state, localStorage persistence | `store/issue-store.ts` |
| **React Hook Form & Zod** | Client-side validation with instant feedback using shared schemas | `components/forms/report-issue-form.tsx`<br>`schemas/issue-schema.ts` |
| **Server Actions** | Strongly-typed server mutations with optimistic client response handling | `actions/issue-actions.ts`<br>`actions/admin-actions.ts` |
| **Responsive Design** | Full support across 375px mobile, tablet, and wide desktop viewports | `components/layout/app-sidebar.tsx`<br>`components/layout/app-header.tsx`<br>`components/dashboard/issue-row.tsx` |
| **Accessible UI & Keyboard** | Radix UI primitives, visible focus rings, ARIA roles, shortcuts (`Cmd+K`, `/`, `?`, `[`) | `components/command/command-palette.tsx`<br>`components/command/shortcuts-modal.tsx` |

---

## Assignment 2 Deliverables Mapping

| Requirement | Implementation Details | File References |
| :--- | :--- | :--- |
| **Prisma ORM & PostgreSQL** | Normalized schema: `User`, `Issue`, `IssueStatusHistory`, `AuditLog`, `EmailDelivery` | `prisma/schema.prisma`<br>`lib/prisma.ts` |
| **Relational Seeding** | Seed script generating realistic users across roles, campus issues, history, and audits | `prisma/seed.ts` |
| **Better Auth** | Authentication with secure sessions, bcrypt password hashing, and cookie management | `lib/auth.ts`<br>`lib/auth-client.ts`<br>`app/api/auth/[...all]/route.ts` |
| **RBAC Authorization** | Role hierarchy (`ADMIN`, `MEMBER`, `GUEST`) enforced in server actions and layout guards | `lib/auth/authorization.ts`<br>`app/admin/layout.tsx` |
| **Admin Operations** | Facilities triage, status progression, staff assignment, user role management | `app/admin/issues/page.tsx`<br>`app/admin/users/page.tsx`<br>`components/admin/admin-issues-table.tsx` |
| **Status History Trail** | Append-only status transition logging with actor metadata and visual timeline | `prisma/schema.prisma`<br>`components/dashboard/issue-details.tsx` |
| **Audit Logging** | Granular audit trail capturing actor, action, object, and state mutation deltas | `prisma/schema.prisma`<br>`app/admin/audit/page.tsx` |
| **React Email Templates** | Declarative email notification templates for status transitions and issue assignments | `components/email/issue-status-email.tsx` |
| **Resend Integration** | Transactional email dispatch triggered by status progressions | `lib/email.ts`<br>`actions/admin-actions.ts` |
| **Resend Webhook & Idempotency** | Cryptographic Svix signature verification, idempotency checking, and delivery telemetry | `app/api/webhooks/resend/route.ts`<br>`app/admin/email/page.tsx` |
