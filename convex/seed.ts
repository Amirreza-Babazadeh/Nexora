import { v } from "convex/values";
import { mutation } from "./_generated/server";

// 1. Seed Public Demo Data across fake companies
export const seedPublicDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const demoJobs = [
      {
        title: "Senior Full-Stack Engineer",
        companyName: "Vercel",
        location: "Remote (Global)",
        employmentType: "full-time" as const,
        workMode: "remote" as const,
        experienceLevel: "senior" as const,
        type: "full-time",
        category: "Engineering",
        salaryMin: 140000,
        salaryMax: 190000,
        description: "Join Vercel's core DX team to push the boundaries of Next.js, Turbopack, and edge runtime performance. You will build high-scale web infrastructure used by millions of developers worldwide.",
        orgId: "org_vercel_fake",
        isFeatured: true,
      },
      {
        title: "Lead Product Designer (Design Systems)",
        companyName: "Figma Design",
        location: "San Francisco, CA (Hybrid)",
        employmentType: "full-time" as const,
        workMode: "hybrid" as const,
        experienceLevel: "lead" as const,
        type: "full-time",
        category: "Design",
        salaryMin: 150000,
        salaryMax: 200000,
        description: "Lead the evolution of Figma's internal design tokens, UI component primitives, and accessible design system architecture. Work closely with cross-functional product and engineering leads.",
        orgId: "org_figma_fake",
        isFeatured: true,
      },
      {
        title: "Backend Platform Engineer (Distributed Systems)",
        companyName: "Stripe",
        location: "New York, NY",
        employmentType: "full-time" as const,
        workMode: "onsite" as const,
        experienceLevel: "mid" as const,
        type: "full-time",
        category: "Engineering",
        salaryMin: 160000,
        salaryMax: 220000,
        description: "Architect high-availability financial infrastructure that processes billions in global payments daily. Build resilient microservices with low latency and 99.999% uptime guarantees.",
        orgId: "org_stripe_fake",
        isFeatured: true,
      },
      {
        title: "AI Research Scientist (LLMs & Multi-Modal)",
        companyName: "OpenAI Labs",
        location: "San Francisco, CA",
        employmentType: "full-time" as const,
        workMode: "onsite" as const,
        experienceLevel: "lead" as const,
        type: "full-time",
        category: "Engineering",
        salaryMin: 220000,
        salaryMax: 350000,
        description: "Conduct cutting-edge artificial intelligence research on foundation models, post-training alignment, and reasoning architectures. Publish research papers and train state-of-the-art neural networks.",
        orgId: "org_openai_fake",
        isFeatured: true,
      },
      {
        title: "Senior Technical Product Manager",
        companyName: "Convex Realtime",
        location: "Remote (US/Canada)",
        employmentType: "full-time" as const,
        workMode: "remote" as const,
        experienceLevel: "senior" as const,
        type: "full-time",
        category: "Engineering",
        salaryMin: 135000,
        salaryMax: 180000,
        description: "Drive developer platform features for Convex backend-as-a-service. Work directly with developer communities, analyze usage metrics, and shape product roadmaps for realtime cloud DBs.",
        orgId: "org_convex_fake",
        isFeatured: false,
      },
      {
        title: "Growth Marketing Manager",
        companyName: "Stripe",
        location: "Remote (US)",
        employmentType: "full-time" as const,
        workMode: "remote" as const,
        experienceLevel: "mid" as const,
        type: "full-time",
        category: "Marketing",
        salaryMin: 110000,
        salaryMax: 145000,
        description: "Scale Stripe's B2B developer acquisition campaigns, SEO strategies, and developer conference presence. Manage multi-channel acquisition budgets and optimize conversion funnels.",
        orgId: "org_stripe_fake",
        isFeatured: false,
      },
      {
        title: "Enterprise Account Executive",
        companyName: "Vercel",
        location: "San Francisco, CA",
        employmentType: "full-time" as const,
        workMode: "hybrid" as const,
        experienceLevel: "senior" as const,
        type: "full-time",
        category: "Sales",
        salaryMin: 120000,
        salaryMax: 240000,
        description: "Close high-ticket enterprise contracts with Fortune 500 engineering organizations migrating to Next.js and Vercel Enterprise Infrastructure.",
        orgId: "org_vercel_fake",
        isFeatured: false,
      },
      {
        title: "Junior UI/UX Designer",
        companyName: "Figma Design",
        location: "Austin, TX (Remote)",
        employmentType: "contract" as const,
        workMode: "remote" as const,
        experienceLevel: "junior" as const,
        type: "contract",
        category: "Design",
        salaryMin: 70000,
        salaryMax: 95000,
        description: "Collaborate with senior designers to craft responsive wireframes, interactive prototypes, and visual assets for upcoming creative tools.",
        orgId: "org_figma_fake",
        isFeatured: false,
      },
    ];

    const fakeApplicants = [
      { name: "Alex Chen", email: "alex.chen@devmail.io", resume: "https://linkedin.com/in/alexchen-demo" },
      { name: "Sarah Jenkins", email: "sarah.j@designstudio.co", resume: "https://dribbble.com/sarahj_demo" },
      { name: "Marcus Vance", email: "marcus.v@cloudtech.com", resume: "https://github.com/marcusvance" },
      { name: "Elena Rostova", email: "elena.r@ai-labs.org", resume: "https://scholar.google.com/citations?user=elena" },
      { name: "David Kim", email: "david.kim@frontend.dev", resume: "https://github.com/davidkim-demo" },
      { name: "Maya Patel", email: "maya.patel@growthhack.io", resume: "https://linkedin.com/in/mayapatel" },
    ];

    const statuses: Array<"submitted" | "under_review" | "interviewing" | "rejected" | "hired"> = [
      "submitted",
      "under_review",
      "interviewing",
      "rejected",
      "hired",
    ];

    let createdJobsCount = 0;
    let createdAppsCount = 0;

    for (const jobData of demoJobs) {
      const jobId = await ctx.db.insert("jobs", {
        title: jobData.title,
        companyName: jobData.companyName,
        location: jobData.location,
        employmentType: jobData.employmentType,
        workMode: jobData.workMode,
        experienceLevel: jobData.experienceLevel,
        type: jobData.type,
        category: jobData.category,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        salaryCurrency: "USD",
        description: jobData.description,
        status: "active",
        authorUserId: "seed_system_author",
        orgId: jobData.orgId,
        isFeatured: jobData.isFeatured,
      });
      createdJobsCount++;

      // Create 2-3 fake applications for each job
      for (let i = 0; i < 3; i++) {
        const applicant = fakeApplicants[(createdJobsCount + i) % fakeApplicants.length];
        const status = statuses[(createdJobsCount + i) % statuses.length];

        await ctx.db.insert("applications", {
          jobId,
          applicantName: applicant.name,
          applicantEmail: applicant.email,
          resumeUrl: applicant.resume,
          coverLetter: `Hi hiring team at ${jobData.companyName},\n\nI am thrilled to apply for the ${jobData.title} position. With 5+ years of industry experience, I am confident in delivering high impact for your team.\n\nBest regards,\n${applicant.name}`,
          status,
          appliedAt: Date.now() - (i + 1) * 86400000,
        });
        createdAppsCount++;
      }
    }

    return {
      success: true,
      message: `Seeded ${createdJobsCount} jobs and ${createdAppsCount} applications for demo organizations.`,
    };
  },
});

// 2. Seed Data specifically for the user's Clerk User ID and Clerk Organization ID
export const seedUserWorkspaceData = mutation({
  args: {
    clerkUserId: v.string(),
    clerkOrgId: v.string(),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
    orgName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clerkUserId, clerkOrgId } = args;

    if (!clerkUserId || !clerkOrgId) {
      throw new Error("Clerk User ID and Clerk Organization ID are required.");
    }

    // 1. Ensure user record exists in users table
    const existingUser =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
        .first()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkUserId))
        .first());

    if (!existingUser) {
      const firstName = args.userName ? args.userName.trim().split(/\s+/)[0] || "Employer" : "Employer";
      const lastName = args.userName ? args.userName.trim().split(/\s+/).slice(1).join(" ") || "Admin" : "Admin";

      await ctx.db.insert("users", {
        clerkUserId,
        clerkId: clerkUserId,
        firstName,
        lastName,
        name: args.userName || "Employer Admin",
        email: args.userEmail || "admin@company.com",
        role: "employer",
      });
    }

    const companyName = args.orgName || "My Active Workspace";

    // 2. Custom Job Postings for the user's active Organization
    const workspaceJobs = [
      {
        title: "Senior React / Next.js Engineer",
        location: "Remote (Global)",
        employmentType: "full-time" as const,
        workMode: "remote" as const,
        experienceLevel: "senior" as const,
        type: "full-time",
        category: "Engineering",
        salaryMin: 130000,
        salaryMax: 175000,
        description: `Join ${companyName} as a Senior Frontend Engineer. You will spearhead our Next.js App Router migration, Tailwind CSS design architecture, and real-time state synchronization.`,
        isFeatured: true,
      },
      {
        title: "Product Designer & UI Lead",
        location: "San Francisco, CA (Hybrid)",
        employmentType: "full-time" as const,
        workMode: "hybrid" as const,
        experienceLevel: "lead" as const,
        type: "full-time",
        category: "Design",
        salaryMin: 125000,
        salaryMax: 165000,
        description: `Shape the visual identity and user experience for ${companyName}. Define design systems, conduct usability studies, and collaborate directly with product leadership.`,
        isFeatured: true,
      },
      {
        title: "Backend Cloud Architect",
        location: "Austin, TX / Remote",
        employmentType: "full-time" as const,
        workMode: "hybrid" as const,
        experienceLevel: "senior" as const,
        type: "full-time",
        category: "Engineering",
        salaryMin: 150000,
        salaryMax: 200000,
        description: `Build secure, scalable microservices and serverless infrastructure at ${companyName}. Implement Convex databases, distributed caching, and zero-downtime CI/CD deployment pipelines.`,
        isFeatured: false,
      },
      {
        title: "Technical Growth Specialist",
        location: "Remote",
        employmentType: "contract" as const,
        workMode: "remote" as const,
        experienceLevel: "mid" as const,
        type: "contract",
        category: "Marketing",
        salaryMin: 90000,
        salaryMax: 120000,
        description: `Drive developer acquisition and organic growth for ${companyName}. Manage SEO, developer community engagement, technical blog content, and funnel conversion optimization.`,
        isFeatured: false,
      },
      {
        title: "Enterprise Solutions Manager",
        location: "New York, NY",
        employmentType: "full-time" as const,
        workMode: "onsite" as const,
        experienceLevel: "senior" as const,
        type: "full-time",
        category: "Sales",
        salaryMin: 110000,
        salaryMax: 190000,
        description: `Manage high-touch enterprise sales cycles for ${companyName}. Partner with technical decision-makers and enterprise client executives to deliver custom software solutions.`,
        isFeatured: false,
      },
    ];

    const fakeApplicantsPool = [
      { name: "Jordan Taylor", email: "jordan.taylor@techdev.org", resume: "https://github.com/jordantaylor", cover: "Excited to bring 6 years of Next.js and TypeScript expertise to your team." },
      { name: "Sophia Martinez", email: "sophia.m@uiuxcraft.com", resume: "https://dribbble.com/sophiam", cover: "I have designed systems for top B2B SaaS platforms and would love to lead design here." },
      { name: "Liam O'Connor", email: "liam.oc@backendops.io", resume: "https://linkedin.com/in/liam-oconnor", cover: "Extensive background in distributed cloud databases and serverless architectures." },
      { name: "Chloe Dupont", email: "chloe.dupont@growthlabs.co", resume: "https://linkedin.com/in/chloedupont", cover: "Specialized in developer advocacy and performance-driven B2B growth marketing." },
      { name: "Noah Williams", email: "noah.w@enterprise-sales.net", resume: "https://linkedin.com/in/noahwilliams", cover: "Proven track record closing enterprise deals with Fortune 500 tech companies." },
      { name: "Zoe Anderson", email: "zoe.a@frontendcraft.dev", resume: "https://github.com/zoeanderson", cover: "Passionate about accessible UI components, Tailwind CSS, and ultra-fast page loads." },
    ];

    const pipelineStages: Array<"submitted" | "under_review" | "interviewing" | "rejected" | "hired"> = [
      "submitted",
      "under_review",
      "interviewing",
      "rejected",
      "hired",
    ];

    let jobsCount = 0;
    let appsCount = 0;

    for (const jData of workspaceJobs) {
      const jobId = await ctx.db.insert("jobs", {
        title: jData.title,
        companyName,
        location: jData.location,
        employmentType: jData.employmentType,
        workMode: jData.workMode,
        experienceLevel: jData.experienceLevel,
        type: jData.type,
        category: jData.category,
        salaryMin: jData.salaryMin,
        salaryMax: jData.salaryMax,
        salaryCurrency: "USD",
        description: jData.description,
        status: "active",
        authorUserId: clerkUserId,
        orgId: clerkOrgId,
        isFeatured: jData.isFeatured,
      });
      jobsCount++;

      // Create 2-3 candidate applications per job listing
      for (let k = 0; k < 3; k++) {
        const applicant = fakeApplicantsPool[(jobsCount + k) % fakeApplicantsPool.length];
        const status = pipelineStages[(jobsCount + k) % pipelineStages.length];

        await ctx.db.insert("applications", {
          jobId,
          applicantName: applicant.name,
          applicantEmail: applicant.email,
          resumeUrl: applicant.resume,
          coverLetter: `${applicant.cover}\n\nLooking forward to hearing from the ${companyName} hiring team!`,
          status,
          appliedAt: Date.now() - (k + 1) * 43200000, // staggered timestamps
        });
        appsCount++;
      }
    }

    return {
      success: true,
      jobsCount,
      appsCount,
      message: `Successfully seeded ${jobsCount} active job postings and ${appsCount} candidate applications for organization "${companyName}"!`,
    };
  },
});

// 3. Clear Seeded Data (Optional helper to reset workspace)
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const allJobs = await ctx.db.query("jobs").collect();
    const allApps = await ctx.db.query("applications").collect();

    for (const app of allApps) {
      await ctx.db.delete(app._id);
    }
    for (const job of allJobs) {
      await ctx.db.delete(job._id);
    }

    return {
      success: true,
      deletedJobs: allJobs.length,
      deletedApps: allApps.length,
    };
  },
});
