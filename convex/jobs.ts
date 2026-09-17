import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getOrgPlanQuota } from "../lib/orgHelpers";

// 1. Public search & discovery query for B2C job seekers
export const listPublicJobs = query({
  args: {
    search: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()),
    employmentType: v.optional(v.string()),
    workMode: v.optional(v.string()),
    experienceLevel: v.optional(v.string()),
    type: v.optional(v.string()), // Legacy compatibility fallback
  },
  handler: async (ctx, args) => {
    let jobs: Array<Doc<"jobs">> = [];

    const searchTerm = args.search ? args.search.trim() : "";

    const hasCategoryFilter = args.category && args.category !== "all";
    const hasEmploymentTypeFilter = args.employmentType && args.employmentType !== "all";
    const hasWorkModeFilter = args.workMode && args.workMode !== "all";
    const hasExperienceLevelFilter = args.experienceLevel && args.experienceLevel !== "all";

    // Standardize category casing for strict search index equality
    const normalizeCategory = (cat: string) => {
      const standard = ["Engineering", "Design", "Marketing", "Sales", "Other"];
      const found = standard.find((s) => s.toLowerCase() === cat.trim().toLowerCase());
      return found ?? cat.trim();
    };
    const categoryForIndex = hasCategoryFilter ? normalizeCategory(args.category!) : undefined;

    if (searchTerm !== "") {
      type EmploymentType = "full-time" | "part-time" | "contract" | "internship";
      type WorkMode = "remote" | "hybrid" | "onsite";
      type ExperienceLevel = "entry" | "junior" | "mid" | "senior" | "lead";

      // 1. Full-text search on job title with active status and indexed filters pushed down
      const titleMatches = await ctx.db
        .query("jobs")
        .withSearchIndex("search_title", (q) => {
          let builder = q.search("title", searchTerm).eq("status", "active");
          if (categoryForIndex) builder = builder.eq("category", categoryForIndex);
          if (hasEmploymentTypeFilter) builder = builder.eq("employmentType", args.employmentType as EmploymentType);
          if (hasWorkModeFilter) builder = builder.eq("workMode", args.workMode as WorkMode);
          if (hasExperienceLevelFilter) builder = builder.eq("experienceLevel", args.experienceLevel as ExperienceLevel);
          return builder;
        })
        .take(150);

      // 2. Full-text search on company name with active status and indexed filters pushed down
      const companyMatches = await ctx.db
        .query("jobs")
        .withSearchIndex("search_company", (q) => {
          let builder = q.search("companyName", searchTerm).eq("status", "active");
          if (categoryForIndex) builder = builder.eq("category", categoryForIndex);
          if (hasEmploymentTypeFilter) builder = builder.eq("employmentType", args.employmentType as EmploymentType);
          if (hasWorkModeFilter) builder = builder.eq("workMode", args.workMode as WorkMode);
          if (hasExperienceLevelFilter) builder = builder.eq("experienceLevel", args.experienceLevel as ExperienceLevel);
          return builder;
        })
        .take(150);

      // Build ID sets for instant membership lookup
      const titleMatchIdSet = new Set(titleMatches.map((j) => j._id));
      const companyMatchIdSet = new Set(companyMatches.map((j) => j._id));

      // Priority 1: Matched in both title AND company name
      const bothMatches: Array<Doc<"jobs">> = [];
      // Priority 2: Matched in title only
      const titleOnlyMatches: Array<Doc<"jobs">> = [];
      // Priority 3: Matched in company name only
      const companyOnlyMatches: Array<Doc<"jobs">> = [];

      // Categorize title matches preserving title relevance
      for (const j of titleMatches) {
        if (companyMatchIdSet.has(j._id)) {
          bothMatches.push(j);
        } else {
          titleOnlyMatches.push(j);
        }
      }

      // Categorize company matches preserving company relevance
      for (const j of companyMatches) {
        if (!titleMatchIdSet.has(j._id)) {
          companyOnlyMatches.push(j);
        }
      }

      // Deterministic priority ordering: (both) -> (title only) -> (company only)
      jobs = [...bothMatches, ...titleOnlyMatches, ...companyOnlyMatches];
    } else {
      // Default: Fetch recent active jobs ordered by newest
      jobs = await ctx.db
        .query("jobs")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .order("desc")
        .take(200);

      // Apply canonical database field filters with legacy fallbacks
      if (hasCategoryFilter) {
        jobs = jobs.filter((j) => j.category.toLowerCase() === args.category!.toLowerCase());
      }

      if (hasEmploymentTypeFilter) {
        jobs = jobs.filter((j) => (j.employmentType ?? j.type) === args.employmentType);
      }

      if (hasWorkModeFilter) {
        jobs = jobs.filter((j) => {
          const mode = j.workMode ?? (j.location.toLowerCase().includes("remote") ? "remote" : "onsite");
          return mode === args.workMode;
        });
      }

      if (hasExperienceLevelFilter) {
        jobs = jobs.filter((j) => {
          const exp = j.experienceLevel ?? "mid";
          return exp === args.experienceLevel;
        });
      }
    }

    // Filter by location if specified (case-insensitive substring)
    if (args.location && args.location.trim() !== "") {
      const loc = args.location.toLowerCase().trim();
      jobs = jobs.filter((j) => j.location.toLowerCase().includes(loc));
    }

    return jobs;
  },
});

// 2. Fetch single job by ID
export const getJobById = query({
  args: {
    id: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// 3. B2B Query: List jobs owned by active organization
export const listOrgJobs = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (!args.orgId) {
      return [];
    }

    return await ctx.db
      .query("jobs")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// 4. B2B Mutation: Create a new job posting with quota enforcement
export const createJob = mutation({
  args: {
    title: v.string(),
    companyName: v.string(),
    companyLogo: v.optional(v.string()),
    location: v.string(),
    employmentType: v.union(
      v.literal("full-time"),
      v.literal("part-time"),
      v.literal("contract"),
      v.literal("internship")
    ),
    workMode: v.union(
      v.literal("remote"),
      v.literal("hybrid"),
      v.literal("onsite")
    ),
    experienceLevel: v.union(
      v.literal("entry"),
      v.literal("junior"),
      v.literal("mid"),
      v.literal("senior"),
      v.literal("lead")
    ),
    type: v.optional(v.string()),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
    description: v.string(),
    requirements: v.optional(v.array(v.string())),
    category: v.string(),
    orgId: v.string(),
    isFeatured: v.optional(v.boolean()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (!args.orgId) {
      throw new Error("Organization ID is required to post a job");
    }

    // Check active jobs quota for this organization using compound index
    const activeJobs = await ctx.db
      .query("jobs")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "active")
      )
      .collect();

    const quota = getOrgPlanQuota(args.plan);
    if (activeJobs.length >= quota.maxJobs) {
      throw new Error(
        `Job limit reached for your ${quota.name} plan. Allowed: ${quota.maxJobs} active jobs. Upgrade to post more!`
      );
    }

    const jobId = await ctx.db.insert("jobs", {
      title: args.title,
      companyName: args.companyName,
      companyLogo: args.companyLogo,
      location: args.location,
      employmentType: args.employmentType,
      workMode: args.workMode,
      experienceLevel: args.experienceLevel,
      type: args.type ?? args.employmentType,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      salaryCurrency: args.salaryCurrency ?? "USD",
      description: args.description,
      requirements: args.requirements ?? [],
      category: args.category,
      status: "active",
      authorUserId: identity.subject,
      orgId: args.orgId,
      isFeatured: args.isFeatured ?? false,
    });

    return jobId;
  },
});

// 5. Update job status (active/closed)
export const updateJobStatus = mutation({
  args: {
    id: v.id("jobs"),
    status: v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error("Job not found");
    }

    if (job.authorUserId !== identity.subject) {
      throw new Error("Unauthorized: Only the employer who posted this job can update its status.");
    }

    await ctx.db.patch(args.id, { status: args.status });
    return true;
  },
});

// 6. Delete job
export const deleteJob = mutation({
  args: {
    id: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error("Job not found");
    }

    if (job.authorUserId !== identity.subject) {
      throw new Error("Unauthorized: Only the employer who posted this job can delete it.");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

// 7. Update job listing details
export const updateJob = mutation({
  args: {
    id: v.id("jobs"),
    title: v.string(),
    location: v.string(),
    employmentType: v.union(
      v.literal("full-time"),
      v.literal("part-time"),
      v.literal("contract"),
      v.literal("internship")
    ),
    workMode: v.union(
      v.literal("remote"),
      v.literal("hybrid"),
      v.literal("onsite")
    ),
    experienceLevel: v.union(
      v.literal("entry"),
      v.literal("junior"),
      v.literal("mid"),
      v.literal("senior"),
      v.literal("lead")
    ),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
    description: v.string(),
    requirements: v.optional(v.array(v.string())),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error("Job not found");
    }

    if (job.authorUserId !== identity.subject) {
      throw new Error("Unauthorized: Only the employer who posted this job can edit its details.");
    }

    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      location: args.location.trim(),
      employmentType: args.employmentType,
      type: args.employmentType,
      workMode: args.workMode,
      experienceLevel: args.experienceLevel,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      salaryCurrency: args.salaryCurrency ?? "USD",
      description: args.description.trim(),
      requirements: args.requirements,
      category: args.category,
    });

    return true;
  },
});

// 7. Migration helper: Backfill legacy jobs with structured fields (internal only)
export const migrateLegacyJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allJobs = await ctx.db.query("jobs").collect();
    let updatedCount = 0;

    for (const job of allJobs) {
      const needsEmploymentType = !job.employmentType;
      const needsWorkMode = !job.workMode;
      const needsExperienceLevel = !job.experienceLevel;

      if (needsEmploymentType || needsWorkMode || needsExperienceLevel) {
        const employmentType: "full-time" | "part-time" | "contract" | "internship" =
          job.employmentType ??
          (job.type === "part-time"
            ? "part-time"
            : job.type === "contract"
              ? "contract"
              : job.type === "internship"
                ? "internship"
                : "full-time");

        const workMode: "remote" | "hybrid" | "onsite" =
          job.workMode ??
          (job.location.toLowerCase().includes("remote") || job.type === "remote"
            ? "remote"
            : job.location.toLowerCase().includes("hybrid")
              ? "hybrid"
              : "onsite");

        const experienceLevel: "entry" | "junior" | "mid" | "senior" | "lead" =
          job.experienceLevel ??
          (job.title.toLowerCase().includes("senior")
            ? "senior"
            : job.title.toLowerCase().includes("lead") || job.title.toLowerCase().includes("principal")
              ? "lead"
              : job.title.toLowerCase().includes("junior")
                ? "junior"
                : job.title.toLowerCase().includes("intern") || job.title.toLowerCase().includes("entry")
                  ? "entry"
                  : "mid");

        await ctx.db.patch(job._id, {
          employmentType,
          workMode,
          experienceLevel,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      totalJobs: allJobs.length,
      updatedJobs: updatedCount,
    };
  },
});

