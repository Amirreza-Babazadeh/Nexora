import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// 1. Fetch only the IDs of jobs saved by the currently authenticated user
export const getMySavedJobIds = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const savedRecords = await ctx.db
      .query("savedJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    return savedRecords.map((record) => record.jobId);
  },
});

// 2. Fetch full saved jobs list with enriched job details for the Saved Jobs page
export const getMySavedJobs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const savedRecords = await ctx.db
      .query("savedJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    // Map each saved record with related job data safely without crashing on missing jobs
    const savedJobsWithDetails = await Promise.all(
      savedRecords.map(async (record) => {
        const job = await ctx.db.get(record.jobId);
        return {
          _id: record._id,
          _creationTime: record._creationTime,
          jobId: record.jobId,
          savedAt: record.savedAt,
          jobTitle: job?.title ?? "Position No Longer Available",
          companyName: job?.companyName ?? "Unknown Company",
          companyLogo: job?.companyLogo,
          location: job?.location ?? "N/A",
          employmentType: job?.employmentType ?? job?.type ?? "full-time",
          workMode: job?.workMode ?? (job?.location.toLowerCase().includes("remote") ? "remote" : "onsite"),
          experienceLevel: job?.experienceLevel ?? "mid",
          type: job?.type ?? job?.employmentType ?? "N/A",
          category: job?.category ?? "N/A",
          salaryMin: job?.salaryMin,
          salaryMax: job?.salaryMax,
          salaryCurrency: job?.salaryCurrency ?? "USD",
          description: job?.description ?? "This job posting is no longer active.",
          requirements: job?.requirements ?? [],
          isFeatured: job?.isFeatured ?? false,
          jobStatus: job?.status ?? "closed",
        };
      })
    );

    // Sort by savedAt descending
    savedJobsWithDetails.sort((a, b) => b.savedAt - a.savedAt);

    return savedJobsWithDetails;
  },
});

// 3. Toggle save state for a job (Idempotent: adds if unsaved, removes if saved)
export const toggleSaveJob = mutation({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if record already exists using the compound index
    const existing = await ctx.db
      .query("savedJobs")
      .withIndex("by_user_and_job", (q) =>
        q.eq("userId", identity.subject).eq("jobId", args.jobId)
      )
      .unique();

    if (existing) {
      // Allow unsaving even if the original job listing was deleted
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    // Verify job exists before creating a new bookmark
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job listing not found");
    }

    await ctx.db.insert("savedJobs", {
      userId: identity.subject,
      jobId: args.jobId,
      savedAt: Date.now(),
    });

    return { saved: true };
  },
});
