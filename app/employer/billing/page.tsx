"use client";

import { useOrganization, useAuth, Protect } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PlanTier, getOrgPlanQuota } from "@/lib/orgHelpers";
import PricingSection from "@/components/PricingSection";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, ShieldCheck, Sparkles } from "lucide-react";

export default function EmployerBillingPage() {
  const { organization, membership } = useOrganization();
  const { has } = useAuth();

  // Entitlement & Plan checks using Clerk's `has()` hook as single source of truth
  const isProPlan = has?.({ plan: "pro" }) || has?.({ plan: "org:pro" });
  const isStarterPlan =
    has?.({ plan: "starter" }) || has?.({ plan: "org:starter" });

  const activePlanTier: PlanTier = isProPlan
    ? "pro"
    : isStarterPlan
      ? "starter"
      : (organization?.publicMetadata?.plan as PlanTier) || "free";

  const quota = getOrgPlanQuota(activePlanTier);

  // Live Convex query for organization's current active job count
  const orgJobs = useQuery(
    api.jobs.listOrgJobs,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const activeJobsCount = orgJobs
    ? orgJobs.filter((j) => j.status === "active").length
    : 0;

  const jobsPercentage =
    quota.maxJobs === Infinity
      ? 0
      : Math.min(Math.round((activeJobsCount / quota.maxJobs) * 100), 100);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-6xl w-full mx-auto">
      {/* Top Organization Overview & Live Usage Card */}
      <Card className="p-3.5 sm:p-6 border-border shadow-md bg-card/80 backdrop-blur-xs space-y-4 sm:space-y-6 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {organization?.name?.[0] ?? "O"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  {organization?.name ?? "Organization"}
                </h1>
                <Badge
                  variant="secondary"
                  className="text-xs font-bold capitalize text-primary bg-primary/10 border-primary/20"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-primary inline" />
                  {quota.name} Plan
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-1 flex items-center gap-2">
                <span>Active Member Role:</span>
                <span className="text-foreground font-semibold bg-muted px-2 py-0.5 rounded-md">
                  {membership?.role ?? "Member"}
                </span>
                {isProPlan && (
                  <span className="text-xs font-bold text-emerald-500">
                    • Pro Subscription Active
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Admin Billing Protection Badge */}
          <Protect
            role="org:admin"
            fallback={
              <Badge
                variant="outline"
                className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 p-2 text-xs"
              >
                🔒 Admin permission required to manage billing
              </Badge>
            }
          >
            <Badge
              variant="default"
              className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Billing Admin Access Enabled
            </Badge>
          </Protect>
        </div>

        {/* Live Plan Quota Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
          {/* Active Jobs Quota */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" /> Active Job
                Postings
              </span>
              <span className="text-foreground">
                {activeJobsCount} /{" "}
                {quota.maxJobs === Infinity ? "Unlimited (∞)" : quota.maxJobs}
              </span>
            </div>

            {quota.maxJobs !== Infinity && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    jobsPercentage >= 100
                      ? "bg-rose-500"
                      : jobsPercentage >= 70
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${jobsPercentage}%` }}
                />
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              {quota.maxJobs === Infinity
                ? "Your Pro plan allows unlimited concurrent job openings."
                : `${quota.maxJobs - activeJobsCount} posting slots remaining on your current tier.`}
            </p>
          </div>

          {/* Team Seats Quota */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Team Seats Capacity
              </span>
              <span className="text-foreground">
                Up to {quota.maxSeats} Seats
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
                style={{
                  width: `${Math.min((1 / quota.maxSeats) * 100, 100)}%`,
                }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Collaborate with hiring managers and reviewers directly inside
              your organization.
            </p>
          </div>
        </div>
      </Card>

      {/* Unified Pricing & Feature Matrix Section */}
      <PricingSection />
    </div>
  );
}
