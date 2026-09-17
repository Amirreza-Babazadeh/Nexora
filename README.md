# 🚀 Nexora — Modern Career & Hiring Platform

[![Netlify Status](https://img.shields.io/badge/Live%20Demo-nexorea.netlify.app-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://nexorea.netlify.app/)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.5-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Convex](https://img.shields.io/badge/Convex-1.36.1-FF5A5F?style=flat-square&logo=convex)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth%20%26%20Orgs-6C47FF?style=flat-square&logo=clerk)](https://clerk.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%204-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

> 🌐 **Live Website**: [https://nexorea.netlify.app/](https://nexorea.netlify.app/)
>
> **Nexora** is an enterprise-grade full-stack hiring ecosystem bridging top tech talent with forward-thinking companies. Featuring sub-50ms reactive queries, multi-tenant B2B organization switching, role-based access control, applicant tracking pipelines (ATS), and seamless SaaS monetization.

---

## ✨ Features at a Glance

### 🧑‍💼 For Job Seekers (Candidates)
- **⚡ Reactive Job Discovery**: Search listings with instant keyword search and multi-facet filtering (Category, Employment Type, Work Mode, Experience Level).
- **📄 One-Click Application**: Apply with uploaded PDF resumes and personalized notes to hiring teams. Includes preflight client-side validation and duplicate submission prevention.
- **💼 Application Tracker**: Track all job submissions in real-time with live status badges (*Under Review*, *Interviewing*, *Hired*, *Rejected*, *Withdrawn*).
- **🔖 Saved Jobs with Optimistic UI**: Instantly bookmark positions with zero UI delay.
- **🌟 Rich Candidate Profile**: Showcase work history, education, verified skills, and generate shareable public recruiter links (`/candidate/[id]`).

### 🏢 For Companies & Employers
- **🏢 Multi-Tenant B2B Organizations**: Manage job listings cooperatively using Clerk B2B Organizations with team member invites and role assignments.
- **📊 Employer Control Center**: Live metrics tracking total open roles, applicants, and recruitment conversion rates.
- **🎯 Kanban ATS Pipeline**: Review applicants, download resumes, advance candidate stages, and trigger automatic candidate notifications.
- **💳 SaaS Billing & Quota Gating**: Embedded Clerk `<PricingTable />` with automated plan gating (*Free*, *Starter*, *Pro*) enforcing active job publishing capacities.

### 🛡️ Security & Performance
- **Edge Route Protection**: Next.js middleware securing private routes at edge nodes.
- **Zero-Trust Backend**: Convex mutations verify caller identity and ownership to prevent unauthorized modifications.
- **Svix Webhook Verification**: Cryptographically validated webhook ingestion for Clerk user sync.
- **Aesthetic Excellence**: Full dark/light mode synchronization, accessible Radix dialogs, and responsive mobile layouts.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Backend & Database**: Convex Cloud (Real-time WebSockets, File Storage, ACID Document Database)
- **Authentication & Multi-Tenancy**: Clerk (OAuth, Email OTP, B2B Organizations, Clerk Billing)
- **Styling**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Sonner Toasts
- **Validation**: React Hook Form, Zod 4

---

## 🏁 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/Amirreza-Babazadeh/nexora.git
cd nexora
```

### 2. Install dependencies
```bash
pnpm install
# or: npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Clerk publishable key, secret key, and Convex deployment variables.

### 4. Run Development Server
```bash
pnpm dev
# or: npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Deep Technical Documentation

For complete architectural diagrams, full database schema definitions, and API routes, see [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md).

---

## 📄 License
This project is licensed under the MIT License.
