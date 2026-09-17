import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper: Authenticate and resolve current Nexora candidate user
async function getAuthenticatedCandidateUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Please sign in to access candidate profile.");
  }

  // Lookup user by Clerk User ID
  const user =
    (await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()) ??
    (await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique());

  if (!user) {
    throw new Error("User record not found in Nexora. Please complete onboarding first.");
  }

  if (user.role !== "candidate") {
    throw new Error("Access denied: Candidate profile is only available for candidate accounts.");
  }

  return user;
}

// Validator schema for experience entry
const experienceEntryValidator = v.object({
  company: v.string(),
  position: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  current: v.boolean(),
  description: v.optional(v.string()),
});

// Validator schema for education entry
const educationEntryValidator = v.object({
  institution: v.string(),
  degree: v.string(),
  field: v.optional(v.string()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
});

// 1. Get my candidate profile (returns null if none exists yet)
export const getMyCandidateProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
        .unique()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique());

    if (!user || user.role !== "candidate") return null;

    return await ctx.db
      .query("candidateProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

// 2. Create candidate profile (strictly enforces 1-to-0/1 relationship)
export const createMyCandidateProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    experience: v.optional(v.array(experienceEntryValidator)),
    education: v.optional(v.array(educationEntryValidator)),
    linkedinUrl: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedCandidateUser(ctx);

    // Verify a profile doesn't already exist
    const existingProfile = await ctx.db
      .query("candidateProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (existingProfile) {
      throw new Error(
        "Candidate profile already exists for this user. Please use updateMyCandidateProfile."
      );
    }

    // Clean skills list: remove empty strings and trim
    const cleanSkills = args.skills
      ? args.skills.map((s) => s.trim()).filter((s) => s.length > 0)
      : undefined;

    const profileId = await ctx.db.insert("candidateProfiles", {
      userId: user._id,
      headline: args.headline?.trim() || undefined,
      bio: args.bio?.trim() || undefined,
      location: args.location?.trim() || undefined,
      skills: cleanSkills,
      experience: args.experience,
      education: args.education,
      linkedinUrl: args.linkedinUrl?.trim() || undefined,
      portfolioUrl: args.portfolioUrl?.trim() || undefined,
    });

    return profileId;
  },
});

// 3. Update candidate profile
export const updateMyCandidateProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    experience: v.optional(v.array(experienceEntryValidator)),
    education: v.optional(v.array(educationEntryValidator)),
    linkedinUrl: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedCandidateUser(ctx);

    const existingProfile = await ctx.db
      .query("candidateProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!existingProfile) {
      throw new Error(
        "Candidate profile not found. Please create your profile before updating."
      );
    }

    // Clean skills list
    const cleanSkills = args.skills
      ? args.skills.map((s) => s.trim()).filter((s) => s.length > 0)
      : undefined;

    await ctx.db.patch(existingProfile._id, {
      headline: args.headline?.trim() || undefined,
      bio: args.bio?.trim() || undefined,
      location: args.location?.trim() || undefined,
      skills: cleanSkills,
      experience: args.experience,
      education: args.education,
      linkedinUrl: args.linkedinUrl?.trim() || undefined,
      portfolioUrl: args.portfolioUrl?.trim() || undefined,
    });

    return existingProfile._id;
  },
});

// 4. Save/Upsert convenience mutation (Creates if none exists, updates if one exists)
export const saveMyCandidateProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    experience: v.optional(v.array(experienceEntryValidator)),
    education: v.optional(v.array(educationEntryValidator)),
    linkedinUrl: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedCandidateUser(ctx);

    const existingProfile = await ctx.db
      .query("candidateProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const cleanSkills = args.skills
      ? args.skills.map((s) => s.trim()).filter((s) => s.length > 0)
      : undefined;

    const data = {
      headline: args.headline?.trim() || undefined,
      bio: args.bio?.trim() || undefined,
      location: args.location?.trim() || undefined,
      skills: cleanSkills,
      experience: args.experience,
      education: args.education,
      linkedinUrl: args.linkedinUrl?.trim() || undefined,
      portfolioUrl: args.portfolioUrl?.trim() || undefined,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, data);
      return existingProfile._id;
    } else {
      return await ctx.db.insert("candidateProfiles", {
        userId: user._id,
        ...data,
      });
    }
  },
});

// 5. Get public candidate profile by userId (supports Convex Id<"users"> or Clerk ID)
export const getCandidatePublicProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    let user: Doc<"users"> | null = null;

    // 1. Try direct Convex Id lookup
    try {
      user = await ctx.db.get(args.userId as Id<"users">);
    } catch {
      user = null;
    }

    // 2. Fallback to Clerk User ID lookup
    if (!user) {
      user =
        (await ctx.db
          .query("users")
          .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.userId))
          .unique()) ??
        (await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
          .unique());
    }

    if (!user || user.role !== "candidate") {
      return null;
    }

    // 3. Fetch candidate profile document
    const profile = await ctx.db
      .query("candidateProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    // 4. Fetch candidate's default or latest resume
    const candidateResumes = await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const defaultResumeDoc =
      candidateResumes.find((r) => r.isDefault) || candidateResumes[0] || null;

    let defaultResume: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      url: string | null;
    } | null = null;

    if (defaultResumeDoc) {
      let downloadUrl: string | null = null;
      try {
        downloadUrl = await ctx.storage.getUrl(defaultResumeDoc.storageId);
      } catch {
        downloadUrl = null;
      }

      defaultResume = {
        fileName: defaultResumeDoc.fileName,
        fileSize: defaultResumeDoc.fileSize,
        mimeType: defaultResumeDoc.mimeType,
        url: downloadUrl,
      };
    }

    const resolvedName =
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "Candidate";

    return {
      user: {
        _id: user._id,
        name: resolvedName,
        imageUrl: user.imageUrl,
        role: user.role,
      },
      profile,
      defaultResume,
    };
  },
});
