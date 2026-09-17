export type PlanTier = "free" | "starter" | "pro";

export interface PlanConfig {
  name: string;
  maxJobs: number;
  maxSeats: number;
  price: string;
  description: string;
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    name: "Free",
    maxJobs: 1,
    maxSeats: 1,
    price: "$0",
    description: "Great for trying out Jobly-Job for your first hire.",
    features: [
      "1 Active Job Posting",
      "1 Team Seat",
      "Standard Application Tracking",
      "Basic Support",
    ],
  },
  starter: {
    name: "Starter",
    maxJobs: 10,
    maxSeats: 10,
    price: "$49 / mo",
    description: "Ideal for growing teams hiring regularly.",
    features: [
      "10 Active Job Postings",
      "10 Team Seats",
      "Applicant Status Pipeline",
      "Priority Candidate Alerts",
      "Standard Analytics",
    ],
  },
  pro: {
    name: "Pro",
    maxJobs: Infinity,
    maxSeats: 25,
    price: "$149 / mo",
    description: "For scaling organizations with high hiring volume.",
    features: [
      "Unlimited Active Job Postings",
      "25 Team Seats",
      "Featured Job Postings Badge",
      "Advanced Applicant Search",
      "Dedicated Support",
    ],
  },
};

export function getOrgPlanQuota(plan?: string): PlanConfig {
  const normalizedPlan = (plan?.toLowerCase() ?? "free") as PlanTier;
  return PLAN_CONFIGS[normalizedPlan] ?? PLAN_CONFIGS.free;
}

export function canOrgPostJob(activeJobCount: number, plan?: string): boolean {
  const quota = getOrgPlanQuota(plan);
  return activeJobCount < quota.maxJobs;
}
