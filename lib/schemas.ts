import { z } from "zod";

export const postJobSchema = z
  .object({
    title: z.string().min(3, "Job title must be at least 3 characters"),
    companyName: z.string().min(2, "Company name is required"),
    location: z.string().min(2, "Location is required"),
    employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
    workMode: z.enum(["remote", "hybrid", "onsite"]),
    experienceLevel: z.enum(["entry", "junior", "mid", "senior", "lead"]),
    category: z.enum(["Engineering", "Design", "Marketing", "Sales", "Other"]),
    salaryMin: z.coerce.number().min(0, "Minimum salary cannot be negative").optional(),
    salaryMax: z.coerce.number().min(0, "Maximum salary cannot be negative").optional(),
    description: z
      .string()
      .min(20, "Job description must be at least 20 characters"),
    isFeatured: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.salaryMin && data.salaryMax && !isNaN(data.salaryMin) && !isNaN(data.salaryMax)) {
        return data.salaryMax >= data.salaryMin;
      }
      return true;
    },
    {
      message: "Maximum salary cannot be lower than minimum salary",
      path: ["salaryMax"],
    }
  );

export type PostJobFormValues = z.input<typeof postJobSchema>;

export const applyJobSchema = z
  .object({
    applicantName: z.string().min(2, "Full name is required"),
    applicantEmail: z.string().email("Please enter a valid email address"),
    resumeStorageId: z.string().optional(),
    resumeFileName: z.string().optional(),
    resumeUrl: z
      .string()
      .url("Please enter a valid URL (e.g. https://linkedin.com/in/name)")
      .optional()
      .or(z.literal("")),
    coverLetter: z
      .string()
      .trim()
      .min(1, "Please write a brief note to the hiring team"),
  })
  .refine(
    (data) =>
      Boolean(data.resumeStorageId) ||
      (Boolean(data.resumeUrl) && data.resumeUrl!.trim().length > 0),
    {
      message: "Please attach a resume or provide a portfolio link",
      path: ["resumeStorageId"],
    }
  );

export type ApplyJobFormValues = z.infer<typeof applyJobSchema>;

export const experienceEntrySchema = z.object({
  company: z.string().min(1, "Company name is required"),
  position: z.string().min(1, "Position / Title is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  current: z.boolean(),
  description: z.string().max(1000, "Description must be under 1000 characters").optional(),
});

export type ExperienceEntryValues = z.infer<typeof experienceEntrySchema>;

export const educationEntrySchema = z.object({
  institution: z.string().min(1, "School / Institution is required"),
  degree: z.string().min(1, "Degree / Certificate is required"),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type EducationEntryValues = z.infer<typeof educationEntrySchema>;

export const candidateProfileSchema = z.object({
  headline: z.string().max(100, "Headline must be under 100 characters").optional(),
  bio: z.string().max(1000, "Bio must be under 1000 characters").optional(),
  location: z.string().max(100, "Location must be under 100 characters").optional(),
  skills: z.array(z.string()),
  experience: z.array(experienceEntrySchema),
  education: z.array(educationEntrySchema),
  linkedinUrl: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || z.string().url().safeParse(val).success,
      { message: "Please enter a valid LinkedIn URL" }
    ),
  portfolioUrl: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || z.string().url().safeParse(val).success,
      { message: "Please enter a valid website URL" }
    ),
});

export type CandidateProfileFormValues = z.infer<typeof candidateProfileSchema>;


