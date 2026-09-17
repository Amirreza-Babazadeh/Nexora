# Nexora - System Architecture Documentation

This document provides a comprehensive technical overview of **Nexora**, a modern B2C/B2B job board platform built with **Next.js 16 (App Router)**, **Convex Realtime Database**, **Clerk B2B Organizations & Billing**, **TailwindCSS**, and **Zod + React Hook Form**.

---

## 1. System Diagram

```
+-----------------------------------------------------------------------------------+
|                                  BROWSER CLIENT                                   |
|                                                                                   |
|  +-----------------------------------+     +-----------------------------------+  |
|  |       B2C Candidate Portal        |     |       B2B Employer Portal         |  |
|  |  (Job Search, Filters, Apply)     |     |  (Dashboard, Post Job, Pipeline)  |  |
|  +-----------------------------------+     +-----------------------------------+  |
|                                    \         /                                    |
|                                     v       v                                     |
|                       React Hook Form + Zod Validation                            |
+-----------------------------------------------------------------------------------+
                                         |
                        +----------------+----------------+
                        |                                 |
                        v                                 v
            +-----------------------+         +-----------------------+
            |  Clerk Authentication |         | Convex Realtime Cloud |
            |  & Organizations SDK  |         | WebSocket Connection  |
            +-----------------------+         +-----------------------+
                        |                                 |
            (Issues Clerk JWT Token)             (Validates Token via
                        |                        auth.config.ts)
                        +----------------+----------------+
                                         |
                                         v
                         +-------------------------------+
                         | Convex Server Backend (V8)    |
                         | - jobs.ts                     |
                         | - applications.ts             |
                         | - users.ts                    |
                         +-------------------------------+
                                         |
                                         v
                         +-------------------------------+
                         | Convex Database Engine        |
                         | - users table                 |
                         | - jobs table                  |
                         | - applications table          |
                         +-------------------------------+
```

---

## 2. Technology Decisions

### Next.js 16 (App Router & Turbopack)
- **Decision**: Used for modern React server/client component boundaries, file-based routing, and optimized production builds.
- **Benefits**: Seamless integration with Clerk Auth wrappers, fast HMR in development, and SSR performance.

### Convex 1.36 Serverless Database
- **Decision**: Serverless realtime cloud database replacing traditional SQL/ORM setups.
- **Benefits**: Persistent WebSocket connection pushes database changes to all open client tabs instantly without page reloads or manual polling. End-to-end TypeScript types generated automatically.

### Clerk (B2B Multi-Tenancy & Single Source of Truth Billing)
- **Decision**: Clerk serves as the **Single Source of Truth** for user authentication, B2B Organizations (`<OrganizationSwitcher />`), Role-Based Access Control (`org:admin`, `org:recruiter`, `org:member`), and B2B Subscription Billing (`<PricingTable for="organization" />`).
- **Elimination of Unnecessary Webhook Sync**: Rather than writing custom database webhooks to mirror subscription status into a local database, authentication, plan gating, and feature entitlement checks are evaluated dynamically using Clerk components (`<Protect>`) and Clerk hooks (`useAuth().has({ plan })` / `has({ feature })`).
- **Benefits**: Zero database synchronization overhead, instant subscription updates, no billing state drift, and built-in entitlement checking.

### React Hook Form + Zod Schema Validation
- **Decision**: Client-side form management connected to Zod schemas (`@hookform/resolvers/zod`).
- **Benefits**: High-performance form state management without re-render lag, coupled with centralized type-safe validation rules in `lib/schemas.ts`.

---

## 3. Data Flow

```
User Input (Form Submission)
       │
       ▼
React Hook Form + Zod Schema Validation (lib/schemas.ts)
       │ (On success)
       ▼
Clerk JWT Session Injection (ConvexProviderWithClerk)
       │
       ▼
Convex RPC Function Execution (e.g., jobs.ts -> createJob)
       │
       ▼
Convex Server Verification (ctx.auth.getUserIdentity() & JobQuotaGate check)
       │
       ▼
Convex Database Write (jobs / applications table patch)
       │
       ▼
Realtime WebSocket Broadcast -> Automatic UI Reactivity Across Clients
```

---

## 4. Authentication & Authorization Flow

1. **User Authentication**:
   - Candidates and Employers log in via Clerk modals.
   - Clerk sets an HTTP session cookie and issues a JWT token.
2. **Convex Identity Sync**:
   - `ConvexProviderWithClerk` injects the Clerk JWT into Convex WebSocket connections.
   - Convex validates the token against `auth.config.ts` using `CLERK_JWT_ISSUER_DOMAIN`.
3. **Role-Based Access Control (RBAC) & Entitlements**:
   - Access controls are enforced using Clerk's `<Protect>` component and `has()` authorization checks.
   - **Admin** (`org:admin` / `has({ plan: 'pro' })`): Full access to organization settings, billing management, member invites, job creation, and candidate pipeline.
   - **Recruiter** (`org:recruiter`): Access to job creation, editing, and candidate pipeline management.
   - **Member** (`org:member`): Read-only access to job listings and candidate applications.
4. **Direct Clerk Entitlement & Quota Checks**:
   - Active plan subscription and features are evaluated via `has({ plan })` and `has({ feature })` from `useAuth()` / `auth()`, eliminating redundant database webhook syncs.

---

## 5. Database Design

### Schema Overview (`convex/schema.ts`)

#### `users` Table
- `clerkId` (string, indexed by `by_clerkId`)
- `name` (optional string)
- `email` (string)
- `imageUrl` (optional string)
- `role` (optional string: `"candidate"` | `"employer"`)

#### `jobs` Table
- `title` (string)
- `companyName` (string)
- `companyLogo` (optional string)
- `location` (string)
- `type` (string: `"full-time"` | `"part-time"` | `"contract"` | `"remote"`, indexed by `by_type`)
- `salaryMin` (optional number)
- `salaryMax` (optional number)
- `salaryCurrency` (optional string)
- `description` (string)
- `requirements` (optional string array)
- `category` (string, indexed by `by_category`)
- `status` (`"active"` | `"draft"` | `"closed"`, indexed by `by_status`)
- `authorUserId` (string)
- `orgId` (string, indexed by `by_orgId`)
- `isFeatured` (optional boolean)

#### `applications` Table
- `jobId` (Id<"jobs">, indexed by `by_jobId`)
- `applicantUserId` (optional string, indexed by `by_applicantUserId`)
- `applicantName` (string)
- `applicantEmail` (string)
- `resumeUrl` (optional string)
- `coverLetter` (optional string)
- `status` (`"submitted"` | `"under_review"` | `"interviewing"` | `"rejected"` | `"hired"`)
- `appliedAt` (number timestamp)

---

## 6. Development Workflow

### Local Setup & Environment
- **Development Command**: `pnpm dev` (runs `convex dev --start "next dev"`).
- **Database Seeding CLI**: `pnpm seed --user=<ClerkUserID> --org=<ClerkOrgID>`
- **Environment File**: [.env.local](file:///d:/vibe%20coding%20project/jobly-job/.env.local).

### Code Validation Commands
- **Type Checking**: `npx tsc --noEmit`
- **Production Build**: `pnpm build`

---

## 7. Future Improvements

1. **Full-Text Search Index**: Transition `listPublicJobs` from in-memory array filtering to Convex `searchIndex`.
2. **Direct PDF Resume Storage**: Integrate Convex Storage (`ctx.storage.generateUploadUrl`) for direct PDF uploads.
3. **Email Notification Engine**: Trigger email notifications (via Resend) when candidate applications are submitted or pipeline statuses update.
4. **AI Resume Matching**: Integrate embeddings to score candidate qualifications against job requirement criteria automatically.
