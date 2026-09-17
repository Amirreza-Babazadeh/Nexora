import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// 1. Submit Application (B2C Candidate flow)
export const submitApplication = mutation({
  args: {
    jobId: v.id("jobs"),
    applicantName: v.string(),
    applicantEmail: v.string(),
    resumeStorageId: v.optional(v.id("_storage")),
    resumeFileName: v.optional(v.string()),
    resumeUrl: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Validate that either a stored resume or external URL is provided
    if (!args.resumeStorageId && (!args.resumeUrl || !args.resumeUrl.trim())) {
      throw new Error("Please attach a resume or provide a portfolio link.");
    }

    // Validate that a non-empty note/cover letter is provided
    if (!args.coverLetter || !args.coverLetter.trim()) {
      throw new Error("Please provide a note or cover letter to the hiring team.");
    }

    // Verify job exists and is active
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job listing not found");
    }

    if (job.status !== "active") {
      throw new Error("This job listing is no longer accepting applications");
    }

    // Prevent poster/author from applying to their own job
    if (identity && identity.subject === job.authorUserId) {
      throw new Error("You cannot apply to a job listing created by your own account.");
    }

    // Verify stored resume file exists in Convex storage if provided
    if (args.resumeStorageId) {
      const storageDoc = await ctx.db.system.get("_storage", args.resumeStorageId);
      if (!storageDoc) {
        throw new Error("Selected resume file not found in storage. Please upload or select a valid resume.");
      }
    }

    // Check for existing application to prevent duplicate applications
    const existingApps = await ctx.db
      .query("applications")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();

    const alreadyApplied = existingApps.some(
      (app) =>
        app.status !== "withdrawn" &&
        ((identity?.subject && app.applicantUserId === identity.subject) ||
          app.applicantEmail.toLowerCase() === args.applicantEmail.trim().toLowerCase())
    );

    if (alreadyApplied) {
      throw new Error("You have already submitted an active application for this job listing.");
    }

    const applicationId = await ctx.db.insert("applications", {
      jobId: args.jobId,
      applicantUserId: identity?.subject ?? undefined,
      applicantName: args.applicantName.trim(),
      applicantEmail: args.applicantEmail.trim(),
      resumeStorageId: args.resumeStorageId,
      resumeFileName: args.resumeFileName?.trim(),
      resumeUrl: args.resumeUrl?.trim(),
      coverLetter: args.coverLetter?.trim(),
      status: "submitted",
      appliedAt: Date.now(),
    });

    // Notify employer if authorUserId is registered
    if (job.authorUserId) {
      await ctx.db.insert("notifications", {
        userId: job.authorUserId,
        title: "New Application Received",
        message: `${args.applicantName.trim()} applied for "${job.title}".`,
        type: "application_received",
        link: "/employer/applications",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return applicationId;
  },
});

// Check if user has already applied or is job author
export const checkApplicationStatus = query({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isAuthor: false, hasApplied: false };
    }

    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return { isAuthor: false, hasApplied: false };
    }

    const isAuthor = job.authorUserId === identity.subject;

    const existingApps = await ctx.db
      .query("applications")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();

    const hasApplied = existingApps.some(
      (app) => app.applicantUserId === identity.subject && app.status !== "withdrawn"
    );

    return { isAuthor, hasApplied };
  },
});

// 2. Fetch applications for jobs owned by the caller's organization (B2B Employer flow)
export const getOrgApplications = query({
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

    // 1. Fetch all jobs belonging to this org using index
    const orgJobs = await ctx.db
      .query("jobs")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    if (orgJobs.length === 0) {
      return [];
    }

    const jobMap = new Map(orgJobs.map((j) => [j._id, j]));

    // 2. Fetch all applications for these jobs using index (avoid full table scan)
    const nestedApps = await Promise.all(
      orgJobs.map((j) =>
        ctx.db
          .query("applications")
          .withIndex("by_jobId", (q) => q.eq("jobId", j._id))
          .collect()
      )
    );
    const rawApplications = nestedApps
      .flat()
      .filter((app) => app.status !== "withdrawn");

    // 3. Resolve signed storage URLs and format application items
    const orgApplications = await Promise.all(
      rawApplications.map(async (app) => {
        let resolvedResumeUrl = app.resumeUrl ?? null;
        if (app.resumeStorageId) {
          try {
            const storageUrl = await ctx.storage.getUrl(app.resumeStorageId);
            if (storageUrl) {
              resolvedResumeUrl = storageUrl;
            }
          } catch {
            // Fallback to resumeUrl if storage getUrl fails
          }
        }

        return {
          ...app,
          status: app.status as
            | "submitted"
            | "under_review"
            | "interviewing"
            | "rejected"
            | "hired",
          resumeUrl: resolvedResumeUrl,
          resumeFileName: app.resumeFileName ?? (app.resumeStorageId ? "Resume.pdf" : null),
          jobTitle: jobMap.get(app.jobId)?.title ?? "Unknown Job",
          companyName: jobMap.get(app.jobId)?.companyName ?? "",
        };
      })
    );

    return orgApplications.sort((a, b) => b.appliedAt - a.appliedAt);
  },
});

// 3. Update candidate application status (B2B Employer flow)
export const updateApplicationStatus = mutation({
  args: {
    id: v.id("applications"),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("interviewing"),
      v.literal("rejected"),
      v.literal("hired")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const application = await ctx.db.get(args.id);
    if (!application) {
      throw new Error("Application not found");
    }

    const job = await ctx.db.get(application.jobId);
    if (!job) {
      throw new Error("Associated job listing not found");
    }

    // Security check: Only the job poster can update status
    const isAuthor = job.authorUserId === identity.subject;
    if (!isAuthor) {
      throw new Error("Unauthorized: Only the employer managing this job can update application stages.");
    }

    if (application.status === "withdrawn") {
      throw new Error("Cannot update the status of an application that was withdrawn by the candidate.");
    }

    await ctx.db.patch(args.id, { status: args.status });

    // Notify candidate if applicantUserId is registered
    if (application.applicantUserId) {
      const stageLabels: Record<string, string> = {
        submitted: "Submitted",
        under_review: "Under Review",
        interviewing: "Interviewing",
        rejected: "Not Selected",
        hired: "Hired 🎉",
      };
      const stageName = stageLabels[args.status] ?? args.status;

      await ctx.db.insert("notifications", {
        userId: application.applicantUserId,
        title: "Application Stage Updated",
        message: `Your application for "${job.title}" at ${job.companyName} was updated to "${stageName}".`,
        type: "status_change",
        link: "/candidate/applications",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return true;
  },
});

// 4. Fetch applications for the authenticated candidate (B2C Candidate flow)
export const getMyApplications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        total: 0,
        submitted: 0,
        under_review: 0,
        interviewing: 0,
        rejected: 0,
        hired: 0,
        applications: [],
      };
    }

    const candidateApps = (await ctx.db
      .query("applications")
      .withIndex("by_applicantUserId", (q) =>
        q.eq("applicantUserId", identity.subject)
      )
      .collect())
      .filter((app) => app.status !== "withdrawn");

    // Map each application with related job details safely and resolve signed resume URLs
    const applicationsWithJobs = await Promise.all(
      candidateApps.map(async (app) => {
        const job = await ctx.db.get(app.jobId);

        let resolvedResumeUrl = app.resumeUrl ?? null;
        if (app.resumeStorageId) {
          try {
            const storageUrl = await ctx.storage.getUrl(app.resumeStorageId);
            if (storageUrl) {
              resolvedResumeUrl = storageUrl;
            }
          } catch {
            // fallback
          }
        }

        return {
          _id: app._id,
          _creationTime: app._creationTime,
          jobId: app.jobId,
          applicantName: app.applicantName,
          applicantEmail: app.applicantEmail,
          resumeUrl: resolvedResumeUrl,
          resumeFileName: app.resumeFileName ?? (app.resumeStorageId ? "Resume.pdf" : null),
          coverLetter: app.coverLetter,
          status: app.status,
          appliedAt: app.appliedAt,
          jobTitle: job?.title ?? "Position No Longer Available",
          companyName: job?.companyName ?? "Unknown Company",
          companyLogo: job?.companyLogo,
          location: job?.location ?? "N/A",
          type: job?.type ?? "N/A",
          category: job?.category ?? "N/A",
          salaryMin: job?.salaryMin,
          salaryMax: job?.salaryMax,
          salaryCurrency: job?.salaryCurrency ?? "USD",
          jobStatus: job?.status ?? "closed",
        };
      })
    );

    // Sort by appliedAt descending
    applicationsWithJobs.sort((a, b) => b.appliedAt - a.appliedAt);

    // Compute status summary counts
    const statusCounts = {
      total: applicationsWithJobs.length,
      submitted: 0,
      under_review: 0,
      interviewing: 0,
      rejected: 0,
      hired: 0,
    };

    for (const app of applicationsWithJobs) {
      if (app.status in statusCounts) {
        statusCounts[app.status as keyof typeof statusCounts]++;
      }
    }

    return {
      ...statusCounts,
      applications: applicationsWithJobs,
    };
  },
});

// 5. Candidate Mutation: Withdraw and delete an active application
export const withdrawApplication = mutation({
  args: {
    id: v.id("applications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated. Please sign in to withdraw your application.");
    }

    const application = await ctx.db.get(args.id);
    if (!application) {
      throw new Error("Application not found.");
    }

    // Security check: Only the applicant can withdraw their application
    if (application.applicantUserId !== identity.subject) {
      throw new Error("Unauthorized: You can only withdraw applications submitted by your own account.");
    }

    if (application.status === "hired") {
      throw new Error("Cannot withdraw an application that has already resulted in an accepted offer.");
    }

    // Notify the employer in real-time before deletion
    const job = await ctx.db.get(application.jobId);
    if (job?.authorUserId) {
      await ctx.db.insert("notifications", {
        userId: job.authorUserId,
        title: "Application Withdrawn",
        message: `${application.applicantName} withdrew their application for "${job.title}".`,
        type: "status_change",
        link: "/employer/applications",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    // Delete the application from candidate applications
    await ctx.db.delete(args.id);

    return true;
  },
});


