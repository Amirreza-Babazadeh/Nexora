import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_RESUMES_PER_CANDIDATE = 5;
const MAX_FILE_NAME_LENGTH = 80;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

// Helper: Authenticate and resolve current Nexora candidate user
async function getAuthenticatedCandidateUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Please sign in to manage resumes.");
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
    throw new Error("Access denied: Resumes can only be managed by candidate accounts.");
  }

  return user;
}

// 1. Generate secure upload URL for candidate resumes
export const generateResumeUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Requires authenticated candidate
    await getAuthenticatedCandidateUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// 2. Create resume metadata after uploading binary to Convex Storage
export const createResume = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getAuthenticatedCandidateUser(ctx);

      // 1. Validate file name length and characters
      const cleanFileName = args.fileName.trim();
      if (!cleanFileName) {
        throw new Error("File name cannot be empty.");
      }

      if (cleanFileName.length > MAX_FILE_NAME_LENGTH) {
        throw new Error("File name must be 80 characters or fewer.");
      }

      // Reject path traversal characters
      if (/[\/\\]|\.\./.test(cleanFileName)) {
        throw new Error("File name contains invalid characters.");
      }

      const lowerName = cleanFileName.toLowerCase();
      const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
      if (!hasValidExtension) {
        throw new Error("Invalid file format. Only PDF, DOC, and DOCX files are allowed.");
      }

      // 2. Validate MIME type sent by client
      if (!ALLOWED_MIME_TYPES.has(args.mimeType)) {
        throw new Error("Unsupported file type. Only PDF, DOC, and DOCX files are allowed.");
      }

      // 3. Security Boundary: Validate against real Convex Storage metadata
      const storageDoc = await ctx.db.system.get("_storage", args.storageId);
      if (!storageDoc) {
        throw new Error("Uploaded file not found in storage. Please try uploading again.");
      }

      // Enforce size limit against server-verified file size
      const actualSize = storageDoc.size;
      if (actualSize <= 0) {
        throw new Error("Uploaded file is empty.");
      }
      if (actualSize > MAX_RESUME_SIZE_BYTES) {
        throw new Error("File size exceeds the 5 MB maximum limit.");
      }

      // If Convex storage detected a contentType, verify it
      if (storageDoc.contentType && !ALLOWED_MIME_TYPES.has(storageDoc.contentType)) {
        throw new Error("Uploaded file content does not match allowed types (PDF, DOC, DOCX).");
      }

      // 4. Query candidate's existing resumes
      const existingResumes = await ctx.db
        .query("resumes")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();

      // 5. Enforce 5-resume limit
      if (existingResumes.length >= MAX_RESUMES_PER_CANDIDATE) {
        throw new Error(
          `You can upload a maximum of ${MAX_RESUMES_PER_CANDIDATE} resumes. Please delete an existing resume before uploading a new one.`
        );
      }

      // 6. Check for duplicate filename (case-insensitive)
      const hasDuplicateName = existingResumes.some(
        (r) => r.fileName.toLowerCase() === lowerName
      );
      if (hasDuplicateName) {
        throw new Error("A resume with this file name already exists.");
      }

      // 7. Check for duplicate file content via Convex Storage SHA-256 hash
      if (storageDoc.sha256) {
        for (const existingResume of existingResumes) {
          const existingStorage = await ctx.db.system.get("_storage", existingResume.storageId);
          if (
            existingStorage &&
            existingStorage.sha256 &&
            existingStorage.sha256 === storageDoc.sha256
          ) {
            throw new Error("This resume has already been uploaded.");
          }
        }
      }

      // 8. Invariant: 0 resumes -> 0 default, 1+ resumes -> exactly 1 default
      // If candidate currently has 0 resumes, this first resume MUST be default
      const hasDefault = existingResumes.some((r) => r.isDefault);
      const isDefault = existingResumes.length === 0 || !hasDefault;

      const now = Date.now();
      const resumeId = await ctx.db.insert("resumes", {
        userId: user._id,
        storageId: args.storageId,
        fileName: cleanFileName,
        fileSize: actualSize, // Use actual verified size from storage
        mimeType: args.mimeType,
        isDefault,
        createdAt: now,
        updatedAt: now,
      });

      return resumeId;
    } catch (err) {
      // Defensive cleanup: Ensure no orphaned storage file remains if validation or duplicate checks fail
      try {
        await ctx.storage.delete(args.storageId);
      } catch {
        // Ignore cleanup failure
      }
      throw err;
    }
  },
});

// 3. Get all resumes for the authenticated candidate
export const getMyResumes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
        .unique()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique());

    if (!user || user.role !== "candidate") return [];

    // Query resumes using the index
    const resumes = await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Gracefully map each resume to include a signed download/view URL
    // If a storage file is missing, return url as null and isMissingFile as true without failing
    const resumesWithUrls = await Promise.all(
      resumes.map(async (resume) => {
        let fileUrl: string | null = null;
        try {
          fileUrl = await ctx.storage.getUrl(resume.storageId);
        } catch {
          fileUrl = null;
        }

        return {
          ...resume,
          url: fileUrl,
          isMissingFile: !fileUrl,
        };
      })
    );

    // Sort: default resume first, then by createdAt desc
    return resumesWithUrls.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

// 4. Set a resume as the default resume
export const setDefaultResume = mutation({
  args: {
    resumeId: v.id("resumes"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedCandidateUser(ctx);

    const targetResume = await ctx.db.get(args.resumeId);
    if (!targetResume || targetResume.userId !== user._id) {
      throw new Error("Resume not found or access denied.");
    }

    // If already default, no-op
    if (targetResume.isDefault) {
      return targetResume._id;
    }

    const now = Date.now();

    // Fetch all user resumes to unset any existing default
    const existingResumes = await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const resume of existingResumes) {
      if (resume._id !== targetResume._id && resume.isDefault) {
        await ctx.db.patch(resume._id, {
          isDefault: false,
          updatedAt: now,
        });
      }
    }

    // Set target resume as default
    await ctx.db.patch(targetResume._id, {
      isDefault: true,
      updatedAt: now,
    });

    return targetResume._id;
  },
});

// 5. Delete a resume and maintain default invariant
export const deleteResume = mutation({
  args: {
    resumeId: v.id("resumes"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedCandidateUser(ctx);

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== user._id) {
      throw new Error("Resume not found or access denied.");
    }

    const wasDefault = resume.isDefault;

    // 1. Delete binary file from Convex Storage
    try {
      await ctx.storage.delete(resume.storageId);
    } catch {
      // Storage file might already be absent; continue deleting database record
    }

    // 2. Delete database document
    await ctx.db.delete(resume._id);

    // 3. Maintain invariant: if deleted resume was default, promote another resume
    if (wasDefault) {
      const remainingResumes = await ctx.db
        .query("resumes")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();

      if (remainingResumes.length > 0) {
        // Sort newest first and promote the first remaining resume
        remainingResumes.sort((a, b) => b.createdAt - a.createdAt);
        await ctx.db.patch(remainingResumes[0]._id, {
          isDefault: true,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});
