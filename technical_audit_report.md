# Technical Audit Report: Nexora Project

**Project Name**: Nexora  
**Repository Path**: `d:/vibe coding project/jobly-job`  
**Date**: August 6, 2026  
**Auditor**: Antigravity AI Senior Systems Architect  

---

## 1. Project Overview

### What Kind of Application is This?
**Nexora** is a full-stack, production-grade **B2C/B2B Job Search and Hiring Platform** built with **Next.js 16 (App Router)**, **Convex Realtime Cloud Database**, **Clerk B2B Multi-Tenant Authentication & Billing**, and **Tailwind CSS v4 with shadcn UI components**. 

It operates as a dual-sided marketplace:
1. **B2C Candidate Portal**: Job seekers can browse, filter, search, and apply for open positions across top tech companies in real time without refreshing the browser.
2. **B2B Employer Portal**: Hiring managers and organization admins can create multi-tenant company workspaces, post open job listings with salary validation, manage candidate application pipelines, and handle subscription plans via Clerk B2B Billing.

### What is the Purpose of This Website?
The platform bridges the gap between hiring organizations and job seekers by providing a real-time, ultra-responsive experience powered by persistent WebSocket database synchronization. It eliminates traditional page reload delays, complex login barriers, and clunky hiring workflows.

### Currently Existing Features
1. **B2C Public Job Search & Filtering**: Real-time keyword search, location filtering, category selector pills (*Engineering, Design, Marketing, Sales, Other*), and job type chips (*Full-time, Part-time, Contract, Remote*).
2. **Quick Job Application System**: Reactive modal with Zod-validated forms for candidates to submit applications with full name, email, resume/portfolio link, and cover letter notes.
3. **Business Logic & Duplicate Prevention**: Backend checks that prevent employers from applying to their own job listings, and prevent candidates from submitting duplicate applications to the same posting.
4. **Multi-Tenant B2B Employer Portal**: Clerk-powered Organization switcher, company workspace selector, and multi-tenant data isolation.
5. **Job Listing Creator**: Real-time job publisher with Zod numerical salary validation (preventing negative values), arrow spinner removal, and salary range display.
6. **Active Job Quota Enforcement**: Plan tier quota gates (*Free*: 1 active job, *Starter*: 10 active jobs, *Pro*: Unlimited) that prevent posting beyond subscription limits.
7. **Interactive Applicant Pipeline Manager**: B2B status manager table with real-time status updates (`submitted` ➔ `under_review` ➔ `interviewing` ➔ `rejected` ➔ `hired`).
8. **Clerk Single Source of Truth Billing**: Native organization pricing table (`<PricingTable for="organization" />`), `<Protect>` role gating (`org:admin`), and `useAuth().has` entitlement evaluation without redundant database webhooks.
9. **Dynamic Light & Dark Theme System**: System-aware and user-toggled theme switching that dynamically alters backgrounds, components, headers, and Clerk modal components via MutationObserver (`DynamicClerkProvider`).
10. **Terminal Data Seeder CLI**: Standalone runner (`pnpm seed` / `node scripts/seed.js`) to generate mock job listings and applications for active workspace testing or public demo data.

### Missing Features / Potential Enhancements
- **Direct PDF Resume Storage**: Uploading PDF files directly to Convex Storage (`ctx.storage.generateUploadUrl`) instead of external URL links.
- **Email Notifications**: Triggering transactional emails (e.g. via Resend or SendGrid) when an application is submitted or a candidate's status changes.
- **Full-Text Search Indexing**: Replacing in-memory query array filtering in Convex with a native `searchIndex`.
- **Candidate Account Dashboard**: Dedicated portal for job seekers to view past applications and saved jobs.

---

## 2. Technology Stack

### Frontend
- **Framework**: Next.js 16.2.10 (App Router with Turbopack) using React 19.2.5.
- **UI Component Libraries**: `@base-ui/react` (1.6.0), `@radix-ui/react-label`, `@radix-ui/react-slot`, `lucide-react`, `sonner` (Toast notifications).
- **Styling System**: Tailwind CSS v4 (`@tailwindcss/postcss` 4.2.2) with `@theme inline` oklch design tokens and `tw-animate-css`.
- **State Management & Form Handling**: React Hooks (`useState`, `useEffect`), `react-hook-form` (7.83.0), Zod (4.4.3), `@hookform/resolvers`, Convex Realtime WebSocket hooks (`useQuery`, `useMutation`), and Clerk Auth hooks (`useAuth`, `useUser`, `useOrganization`).

### Backend
- **Backend Technology**: Convex 1.36.1 Serverless Cloud Runtime (Node.js/V8 environment).
- **APIs & Server Functions**:
  - `convex/jobs.ts`: `listPublicJobs`, `getJobById`, `listOrgJobs`, `createJob`, `updateJobStatus`, `deleteJob`.
  - `convex/applications.ts`: `submitApplication`, `listApplicationsByJob`, `updateApplicationStatus`, `checkApplicationStatus`.
  - `convex/users.ts`: `syncUser`, `getUserByClerkId`.
  - `convex/seed.ts`: `seedUserWorkspaceData`, `seedPublicDemoData`, `clearAllData`.
- **Middleware & Proxy**: Next.js `proxy.ts` (Clerk middleware routing).

### Database
- **Database Technology**: Convex Realtime Document Database.
- **Schema** (`convex/schema.ts`):
  - `users`: Stores user identity mapping (`clerkId`, `name`, `email`, `imageUrl`, `role`).
  - `jobs`: Stores job postings (`title`, `companyName`, `location`, `type`, `salaryMin`, `salaryMax`, `salaryCurrency`, `description`, `category`, `status`, `authorUserId`, `orgId`, `isFeatured`).
  - `applications`: Stores candidate submissions (`jobId`, `applicantUserId`, `applicantName`, `applicantEmail`, `resumeUrl`, `coverLetter`, `status`, `appliedAt`).
- **Indexes**: `by_clerkId`, `by_orgId`, `by_status`, `by_category`, `by_type`, `by_jobId`, `by_applicantUserId`.

### Authentication
- **Authentication Provider**: Clerk (`@clerk/nextjs` 6.39.6 & `@clerk/themes` 2.4.57).
- **How Login/Signup Works**: Native Clerk modal authentication supporting Google OAuth and Email/Password credentials.
- **Session Management**: Session JWT tokens issued by Clerk, validated in Convex via `auth.config.ts`.
- **Multi-Tenancy & Authorization**: Clerk Organizations (`org:admin`, `org:recruiter`, `org:member`), Clerk `<Protect>` components, and `useAuth().has()` entitlement evaluation.

### Deployment & Build
- **Hosting**: Compatible with Vercel / Cloudflare / Node Server platforms.
- **Environment Variables** (`.env.local`):
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CONVEX_URL`
  - `CLERK_JWT_ISSUER_DOMAIN`
- **Build Process**: `pnpm build` triggers Next.js Turbopack compilation, running TypeScript type-checking (`npx tsc --noEmit`) and generating static/dynamic routes in 6 seconds.

---

## 3. Architecture Explanation

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

### Data Flow Breakdown

```
User Action (e.g. Submitting Application / Creating Job)
       │
       ▼
Frontend Component (React Hook Form + Zod Validation in lib/schemas.ts)
       │ (On client validation success)
       ▼
Authentication Check (Clerk Session JWT injected via ConvexProviderWithClerk)
       │
       ▼
Convex RPC Call (Mutation/Query execution in convex/jobs.ts or applications.ts)
       │
       ▼
Backend Business Logic (ctx.auth.getUserIdentity(), quota verification, duplicate check)
       │
       ▼
Convex Database Operation (Insert / Patch / Delete on indexed tables)
       │
       ▼
Realtime WebSocket Broadcast (Pushed to all active open browser clients instantly)
       │
       ▼
Automatic UI Reactive Update (No manual refetching or window reload required)
```

---

## 4. Folder Structure

```
d:/vibe coding project/jobly-job/
├── .agents/                      # Agent Customizations (Skills, Rules, References)
├── app/                          # Next.js 16 App Router Pages & Layouts
│   ├── employer/                 # B2B Employer Portal Workspace Routes
│   │   ├── applications/         # Applicant Pipeline Table Page
│   │   ├── billing/              # B2B Subscription Billing Page
│   │   ├── dashboard/            # Employer Analytics & Listings Manager
│   │   ├── post-job/             # Job Posting Form Page
│   │   └── layout.tsx            # B2B Organization Layout & Guard
│   ├── globals.css               # Tailwind CSS v4 Theme Variables & Base Styles
│   ├── layout.tsx                # Root App Layout & DynamicClerkProvider
│   └── page.tsx                  # B2C Landing Page & Public Job Search
├── components/                   # Reusable UI & Business Logic Components
│   ├── ui/                       # shadcn UI Primitives (button, card, dialog, form, etc.)
│   ├── ConvexClientProvider.tsx  # Convex-Clerk Integration Provider
│   ├── DynamicClerkProvider.tsx  # Theme-Aware Clerk BaseTheme Wrapper
│   ├── EmployerHeader.tsx        # Responsive B2B Workspace Top Navigation Bar
│   ├── JobQuotaGate.tsx          # Subscription Tier Job Posting Limit Enforcement
│   ├── PricingSection.tsx        # Clerk B2B Pricing Table & Tier Card Reference
│   └── ThemeToggle.tsx           # Light/Dark Theme Switcher Component
├── convex/                       # Convex Backend Cloud Functions & Database Schemas
│   ├── _generated/               # Auto-Generated TypeScript Types & API Definition
│   ├── applications.ts           # Candidate Application Queries & Mutations
│   ├── auth.config.ts            # Clerk JWT Issuer Configuration for Convex Auth
│   ├── jobs.ts                   # Job Listing CRUD Queries & Quota Mutations
│   ├── schema.ts                 # Database Table & Index Definitions
│   ├── seed.ts                   # Database Seeder Mutations for Demo/Testing
│   └── users.ts                  # User Profile Synchronization Functions
├── lib/                          # Shared Utility Functions & Schemas
│   ├── orgHelpers.ts             # Plan Quota Limits & Helper Functions
│   ├── schemas.ts                # Zod Form Validation Schemas
│   └── utils.ts                  # Tailwind Class Name Merger Utility (clsx + twMerge)
├── scripts/                      # Standalone CLI Automation Scripts
│   └── seed.js                   # CLI Database Seeder Execution Script
├── AGENTS.md                     # Workspace AI Rules & Directives
├── ARCHITECTURE.md               # Technical System Architecture Documentation
├── components.json               # shadcn UI Configuration File
├── next.config.ts                # Next.js Build & Runtime Configuration
├── package.json                  # Dependencies & Script Definitions
├── proxy.ts                      # Clerk Middleware Route Handler
├── tsconfig.json                 # TypeScript Compiler Options
└── technical_audit_report.md     # Full Project Technical Audit Report
```

---

## 5. Dependencies Analysis

| Dependency | Purpose | Project Usage & Importance |
|---|---|---|
| `next` (16.2.10) | Core Web Framework | Provides App Router, Turbopack bundling, server components, and routing. |
| `react` / `react-dom` (19.2.5) | UI Rendering Engine | Powers the reactive component UI tree. |
| `convex` (1.36.1) | Realtime Cloud Database | Acts as the backend database and realtime WebSocket sync engine. |
| `@clerk/nextjs` (6.39.6) | Auth & Org SDK | Manages user sign-in, sessions, Clerk B2B Organizations, and `<PricingTable />`. |
| `@clerk/themes` (2.4.57) | Clerk Styling Theme | Provides the `dark` theme preset for Clerk components in dark mode. |
| `@base-ui/react` (1.6.0) | Accessible UI Primitives | Powers unstyled accessible dialogs, selects, and overlays for shadcn components. |
| `@radix-ui/react-slot` | Component Polymorphism | Enables the `asChild` render pattern in shadcn components. |
| `@radix-ui/react-label` | Accessible Form Labels | Connects form inputs to accessible label tags. |
| `react-hook-form` (7.83.0) | Form State Management | Handles form inputs, validation state, and submission handlers efficiently. |
| `@hookform/resolvers` (5.5.7) | Form Validation Resolver | Connects `react-hook-form` with Zod schemas. |
| `zod` (4.4.3) | Schema Validation | Defines strict runtime validation schemas for job posting and application forms. |
| `tailwind-merge` & `clsx` | CSS Utility Merger | Combines conditional Tailwind CSS utility classes without conflicts. |
| `sonner` (2.0.7) | Toast Notifications | Displays floating success and error alerts across candidate and employer flows. |
| `lucide-react` | Icon System | Renders icons for navigation, theme toggling, and UI buttons. |
| `tw-animate-css` | Animation Utilities | Enables smooth transitions and keyframe animations for UI modals and dropdowns. |

---

## 6. Authentication System

### Registration & Login Flow
1. Candidates and Employers register or log in via Clerk's native modal interfaces (`<SignInButton mode="modal">`, `<SignUpButton mode="modal">`).
2. Clerk handles OAuth providers (Google) and Email/Password credentials securely.
3. Upon authentication, Clerk sets an HTTP session cookie and generates an RSA256 JWT session token.

### Convex Identity Integration (`auth.config.ts`)
Convex verifies Clerk session tokens via OpenID Connect:
```ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```
When `ConvexProviderWithClerk` wraps the app, every WebSocket request passes the Clerk JWT. In Convex server functions, identity is authenticated via:
```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

### Protected Routes & Organization Access
- Next.js middleware in `proxy.ts` handles auth checks.
- B2B routes under `/employer/*` require an active Clerk user session.
- `<EmployerLayout>` ensures the logged-in employer belongs to an active Clerk Organization (`useOrganization()`). If no organization is selected, it presents Clerk's `<CreateOrganization />` component.

### Single Source of Truth Billing & RBAC
- Role-based authorization uses Clerk's `<Protect role="org:admin">` component.
- Plan feature entitlements are evaluated directly via `useAuth().has()` without maintaining secondary database subscription tables.

---

## 7. Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       users                             │
├─────────────────────────────────────────────────────────┤
│ _id           : Id<"users"> (PK)                        │
│ clerkId       : string (Indexed by_clerkId)             │
│ name          : string (optional)                       │
│ email         : string                                  │
│ imageUrl      : string (optional)                       │
│ role          : string (optional: candidate/employer)   │
└─────────────────────────────────────────────────────────┘
                            │
                            │ (1 to Many via authorUserId)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                       jobs                              │
├─────────────────────────────────────────────────────────┤
│ _id           : Id<"jobs"> (PK)                         │
│ title         : string                                  │
│ companyName   : string                                  │
│ location      : string                                  │
│ type          : string (Indexed by_type)                │
│ salaryMin     : number (optional)                       │
│ salaryMax     : number (optional)                       │
│ salaryCurrency: string (optional)                       │
│ description   : string                                  │
│ category      : string (Indexed by_category)            │
│ status        : "active" | "draft" | "closed" (Indexed) │
│ authorUserId  : string                                  │
│ orgId         : string (Indexed by_orgId)               │
│ isFeatured    : boolean (optional)                      │
└─────────────────────────────────────────────────────────┘
                            │
                            │ (1 to Many via jobId)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    applications                         │
├─────────────────────────────────────────────────────────┤
│ _id           : Id<"applications"> (PK)                 │
│ jobId         : Id<"jobs"> (FK, Indexed by_jobId)       │
│ applicantUserId: string (optional, Indexed)              │
│ applicantName : string                                  │
│ applicantEmail: string                                  │
│ resumeUrl     : string (optional)                       │
│ coverLetter   : string (optional)                       │
│ status        : "submitted" | "under_review" | ...      │
│ appliedAt     : number (timestamp)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Current Features

### Feature 1: B2C Public Job Search & Category/Type Filtering
- **Frontend Files**: `app/page.tsx`
- **Backend Files**: `convex/jobs.ts` (`listPublicJobs`)
- **Database Tables**: `jobs` (read queries with `by_status` index)
- **User Flow**: Candidate opens landing page ➔ Types keyword/location or selects category chip ➔ `useQuery(api.jobs.listPublicJobs)` filters listings instantly in real time.

### Feature 2: Candidate Quick Apply Modal with Form Validation
- **Frontend Files**: `app/page.tsx`, `lib/schemas.ts` (`applyJobSchema`)
- **Backend Files**: `convex/applications.ts` (`submitApplication`, `checkApplicationStatus`)
- **Database Tables**: `applications` (inserts new submission)
- **User Flow**: Candidate clicks "View Details & Apply" ➔ System checks application status ➔ Candidate fills out form ➔ Validated via Zod ➔ Mutation inserts record into `applications` table.

### Feature 3: Self-Application & Duplicate Submission Blockers
- **Frontend Files**: `app/page.tsx`
- **Backend Files**: `convex/applications.ts` (`submitApplication`, `checkApplicationStatus`)
- **Database Tables**: `jobs`, `applications`
- **User Flow**: If an employer tries to apply to their own job posting, backend throws an error and UI displays `🔒 You are the author of this job posting`. If a candidate has already applied, UI displays `✓ You have already submitted an application for this position`.

### Feature 4: Multi-Tenant B2B Employer Portal & Workspace Switcher
- **Frontend Files**: `app/employer/layout.tsx`, `components/EmployerHeader.tsx`
- **Backend Files**: `convex/users.ts`
- **Database Tables**: `users`, `jobs`
- **User Flow**: Employer logs in ➔ Selects or creates a Clerk B2B Organization ➔ `<EmployerLayout>` isolates workspace data by `orgId`.

### Feature 5: Job Posting Creator with Non-Negative Salary Validation
- **Frontend Files**: `app/employer/post-job/page.tsx`, `lib/schemas.ts` (`postJobSchema`)
- **Backend Files**: `convex/jobs.ts` (`createJob`)
- **Database Tables**: `jobs` (inserts new job record)
- **User Flow**: Employer fills job posting form ➔ Zod validates non-negative salary and hides spinner arrows ➔ `createJob` mutation inserts active job listing.

### Feature 6: Active Job Posting Quota Gate
- **Frontend Files**: `components/JobQuotaGate.tsx`, `lib/orgHelpers.ts`
- **Backend Files**: `convex/jobs.ts` (`createJob`)
- **Database Tables**: `jobs`
- **User Flow**: System compares active job count against subscription limits (*Free*: 1, *Starter*: 10, *Pro*: Unlimited). If quota is exceeded, UI renders an upgrade banner redirecting to billing.

### Feature 7: Interactive Candidate Applicant Pipeline Manager
- **Frontend Files**: `app/employer/applications/page.tsx`
- **Backend Files**: `convex/applications.ts` (`listApplicationsByJob`, `updateApplicationStatus`)
- **Database Tables**: `applications` (patch status)
- **User Flow**: Employer views applicant table ➔ Selects status dropdown (`submitted`, `under_review`, `interviewing`, `rejected`, `hired`) ➔ Mutation updates record and updates all open tabs in real time via WebSockets.

### Feature 8: Clerk Single Source of Truth Billing
- **Frontend Files**: `app/employer/billing/page.tsx`, `components/PricingSection.tsx`
- **Backend Files**: None (Clerk native)
- **Database Tables**: None (Clerk managed)
- **User Flow**: Employer visits `/employer/billing` ➔ Clerk's `<PricingTable for="organization" />` renders available tiers ➔ Subscriptions and entitlement gates evaluated directly via `useAuth().has({ plan })` and `<Protect role="org:admin">`.

### Feature 9: Dynamic Light & Dark Theme System
- **Frontend Files**: `components/DynamicClerkProvider.tsx`, `components/ThemeToggle.tsx`, `app/globals.css`
- **Backend Files**: None
- **User Flow**: User clicks `ThemeToggle` ➔ LocalStorage and `document.documentElement` class update ➔ `DynamicClerkProvider`'s `MutationObserver` detects class change ➔ Clerk baseTheme dynamically switches between `dark` and `light`.

### Feature 10: Terminal Data Seeder CLI Script
- **Frontend Files**: None
- **Backend Files**: `convex/seed.ts`, `scripts/seed.js`
- **Database Tables**: `users`, `jobs`, `applications`
- **User Flow**: Developer runs `pnpm seed --user=user_2x... --org=org_2x...` ➔ Script executes Convex seed mutation directly from terminal.

---

## 9. AI Development Setup

### Installed MCP Servers
- **shadcn MCP Server**: Registered in `.mcp.json` (`npx shadcn@latest mcp`). It provides component schemas, design system rules, and automated component installation guidelines.

### Available Tools
- `view_file` & `write_to_file`: File reading and writing tools.
- `replace_file_content` & `multi_replace_file_content`: Precise code editing tools.
- `list_dir` & `grep_search`: Workspace exploration and code search tools.
- `run_command` & `manage_task`: Command execution tools.
- `schedule`: One-shot and cron timer scheduling.
- `search_web` & `read_url_content`: External web documentation retrieval.
- `generate_image`: AI image generation tool.

### Installed Skills & Rules
- `convex` & Convex sub-skills (`convex-quickstart`, `convex-setup-auth`, `convex-performance-audit`, `convex-migration-helper`): Guidelines for writing correct Convex cloud functions, schema indexes, and authentication config.
- `clerk` & Clerk sub-skills (`clerk-billing`, `clerk-orgs`, `clerk-nextjs-patterns`, `clerk-setup`, `clerk-custom-ui`): Patterns for Clerk auth, B2B organizations, and billing.
- `ui-ux-pro-max`: Guidelines for UI styling, modern color palettes, font pairings, and responsive design systems.
- `vercel-react-best-practices`: Performance optimization guidelines for Next.js and React 19.
- **Project Rule (`AGENTS.md`)**: Instructs AI agents to read `convex/_generated/ai/guidelines.md` before editing Convex code.

---

## 10. Code Quality Review

### Good Practices Currently Used
- **End-to-End Type Safety**: Generated Convex types (`Doc<"jobs">`, `Id<"jobs">`) combined with TypeScript strict mode.
- **Single Source of Truth Billing**: Using Clerk native components and `has()` entitlement checks without redundant database webhook tables.
- **Form Validation**: Centralized Zod schemas in `lib/schemas.ts` connected to `react-hook-form`.
- **Dynamic Theme Adaptation**: `DynamicClerkProvider` using `MutationObserver` to switch Clerk modal themes smoothly.

### Technical Debt & Security Considerations
- **In-Memory Query Filtering**: `listPublicJobs` in `convex/jobs.ts` fetches active jobs and applies `.filter()` in memory. While acceptable for early-stage data volumes, large datasets should use a Convex `searchIndex`.
- **Resume URL Input**: Resumes are currently captured as string URLs instead of direct PDF uploads via Convex Storage (`ctx.storage`).

---

## 11. Learning Guide

### Core Concepts to Master From This Codebase
1. **Realtime Serverless Backend vs. REST**: Observe how Convex eliminates manual `fetch()` polling by using WebSocket subscriptions (`useQuery`).
2. **B2B Multi-Tenancy**: Learn how Clerk Organizations decouple personal user identities from company workspaces (`orgId`).
3. **Single Source of Truth Architecture**: Understand why evaluating subscriptions via `useAuth().has()` is cleaner than syncing payment webhooks to a secondary SQL table.
4. **Declarative Form Validation**: Study how Zod schemas (`lib/schemas.ts`) validate user input on both client and server boundaries.

### Common Mistakes to Avoid
- **Synchronous `setState` inside `useEffect`**: Avoid updating state synchronously inside effect bodies to prevent cascading renders.
- **Database Query Filtering**: Avoid using JavaScript array `.filter()` inside backend database queries when indexed queries (`withIndex`) can filter data at the database engine level.

---

## 12. Future Roadmap

### Short Term (Fixes & Polish)
- **Convex Search Index**: Implement `searchIndex` on `jobs` table for full-text search capability.
- **Direct File Upload**: Add Convex Storage URL generation for direct PDF resume file uploads.

### Medium Term (New Features)
- **Candidate Application Dashboard**: Create a dedicated portal for job seekers to view past submitted applications and status history.
- **Transactional Email Notifications**: Integrate Resend to email candidates when their application status transitions to `interviewing` or `hired`.

### Long Term (Scaling Architecture)
- **AI Candidate Matching**: Implement vector embeddings to score candidate resume experience against job requirements automatically.
- **Multi-Region Cloud Replication**: Configure multi-region database caching for global low-latency job listing queries.
