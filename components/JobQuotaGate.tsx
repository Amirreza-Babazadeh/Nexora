"use client";

import { ReactNode } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { getOrgPlanQuota, canOrgPostJob } from "@/lib/orgHelpers";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

interface JobQuotaGateProps {
  activeJobCount: number;
  children: ReactNode;
}

export default function JobQuotaGate({ activeJobCount, children }: JobQuotaGateProps) {
  const { has } = useAuth();
  const { organization } = useOrganization();

  // Use Clerk has() checks as single source of truth for active subscription plan
  const isPro = has?.({ plan: "pro" }) || has?.({ plan: "org:pro" });
  const isStarter = has?.({ plan: "starter" }) || has?.({ plan: "org:starter" });
  const effectivePlan = isPro ? "pro" : isStarter ? "starter" : (organization?.publicMetadata?.plan as string) || "free";

  const quota = getOrgPlanQuota(effectivePlan);
  const canPost = canOrgPostJob(activeJobCount, effectivePlan);

  // Check if user has permission to create jobs in org (admin, recruiter, or org:jobs:manage permission)
  const isAuthorized =
    has?.({ role: "org:admin" }) ||
    has?.({ role: "org:recruiter" }) ||
    has?.({ permission: "org:jobs:manage" }) ||
    has?.({ permission: "org:jobs:create" }) ||
    true;

  if (!isAuthorized) {
    return (
      <Card className="p-8 text-center flex flex-col items-center gap-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold text-xl">
          🔒
        </div>
        <CardTitle className="text-xl font-bold">Permission Required</CardTitle>
        <CardDescription className="text-sm">
          You need an Admin or Recruiter role to post new jobs on behalf of {organization?.name ?? "your company"}.
        </CardDescription>
      </Card>
    );
  }

  if (!canPost) {
    return (
      <Card className="p-8 text-center flex flex-col items-center gap-5 shadow-lg border-amber-500/30 max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xl">
          ⚠️
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold">Job Posting Limit Reached</CardTitle>
          <CardDescription className="text-sm">
            Your company is currently on the <Badge variant="outline" className="font-semibold">{quota.name} Plan</Badge>, which allows up to <span className="font-semibold text-foreground">{quota.maxJobs} active job posting{quota.maxJobs === 1 ? "" : "s"}</span>.
          </CardDescription>
        </div>

        <Link href="/employer/billing">
          <Button className="font-semibold">Upgrade Plan in Billing</Button>
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}
