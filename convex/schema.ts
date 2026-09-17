import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.optional(v.string()),
    clerkId: v.optional(v.string()), // Legacy compatibility fallback
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    name: v.optional(v.string()), // Legacy compatibility fallback
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("candidate"),
        v.literal("employer")
      )
    ),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_clerkId", ["clerkId"]),

  jobs: defineTable({
    title: v.string(),
    companyName: v.string(),
    companyLogo: v.optional(v.string()),
    location: v.string(),
    employmentType: v.optional(
      v.union(
        v.literal("full-time"),
        v.literal("part-time"),
        v.literal("contract"),
        v.literal("internship")
      )
    ),
    workMode: v.optional(
      v.union(
        v.literal("remote"),
        v.literal("hybrid"),
        v.literal("onsite")
      )
    ),
    experienceLevel: v.optional(
      v.union(
        v.literal("entry"),
        v.literal("junior"),
        v.literal("mid"),
        v.literal("senior"),
        v.literal("lead")
      )
    ),
    type: v.optional(v.string()), // Legacy compatibility fallback
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
    description: v.string(),
    requirements: v.optional(v.array(v.string())),
    category: v.string(), // "Engineering", "Design", "Marketing", "Sales", "Other"
    status: v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("closed")
    ),
    authorUserId: v.string(),
    orgId: v.string(),
    isFeatured: v.optional(v.boolean()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_type", ["type"])
    .index("by_employmentType", ["employmentType"])
    .index("by_workMode", ["workMode"])
    .index("by_experienceLevel", ["experienceLevel"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "category", "employmentType", "workMode", "experienceLevel"],
    })
    .searchIndex("search_company", {
      searchField: "companyName",
      filterFields: ["status", "category", "employmentType", "workMode", "experienceLevel"],
    }),

  applications: defineTable({
    jobId: v.id("jobs"),
    applicantUserId: v.optional(v.string()),
    applicantName: v.string(),
    applicantEmail: v.string(),
    resumeStorageId: v.optional(v.id("_storage")),
    resumeFileName: v.optional(v.string()),
    resumeUrl: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
    status: v.union(
      v.literal("submitted"), 
      v.literal("under_review"),
      v.literal("interviewing"),
      v.literal("rejected"),
      v.literal("hired"),
      v.literal("withdrawn")
    ),
    appliedAt: v.number(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_jobId_and_status", ["jobId", "status"])
    .index("by_applicantUserId", ["applicantUserId"]),

  savedJobs: defineTable({
    userId: v.string(),
    jobId: v.id("jobs"),
    savedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_user_and_job", ["userId", "jobId"]),

  candidateProfiles: defineTable({
    userId: v.id("users"),

    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),

    skills: v.optional(v.array(v.string())),

    experience: v.optional(
      v.array(
        v.object({
          company: v.string(),
          position: v.string(),
          startDate: v.string(),
          endDate: v.optional(v.string()),
          current: v.boolean(),
          description: v.optional(v.string()),
        })
      )
    ),

    education: v.optional(
      v.array(
        v.object({
          institution: v.string(),
          degree: v.string(),
          field: v.optional(v.string()),
          startDate: v.optional(v.string()),
          endDate: v.optional(v.string()),
        })
      )
    ),

    linkedinUrl: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  resumes: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  notifications: defineTable({
    userId: v.string(), // Clerk user ID (recipient)
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("application_received"),
      v.literal("status_change"),
      v.literal("system")
    ),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_isRead", ["userId", "isRead"]),
});


