"use client";

import { ReactNode, useEffect } from "react";
import { useOrganization, useAuth, CreateOrganization } from "@clerk/nextjs";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import EmployerHeader from "@/components/EmployerHeader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EmployerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const myUser = useQuery(api.users.getMyUser);

  // If signed in but onboarding not completed, redirect to /onboarding
  useEffect(() => {
    if (!isConvexAuthLoading && isAuthenticated && myUser === null) {
      router.push("/onboarding");
    }
  }, [isConvexAuthLoading, isAuthenticated, myUser, router]);

  if (!isAuthLoaded || !isOrgLoaded || isConvexAuthLoading || (isAuthenticated && myUser === undefined)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium">
            Loading employer workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <EmployerHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4 shadow-xl border-border">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center font-bold text-xl">
              🔑
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Employer Portal
            </h2>
            <p className="text-muted-foreground text-sm">
              Please sign in to manage your company&apos;s organization, job
              postings, and candidates.
            </p>
            <Link href="/" className="w-full">
              <Button className="w-full font-medium">
                Go to Home / Sign In
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  // If user role is candidate, show role gate message
  if (myUser?.role === "candidate") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <EmployerHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4 shadow-xl border-border">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center font-bold text-xl">
              🛡️
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Candidate Account
            </h2>
            <p className="text-muted-foreground text-sm">
              Your Nexora account is registered as a <strong>Candidate</strong>.
              The Employer Portal is reserved for employer accounts.
            </p>
            <Link href="/" className="w-full mt-2">
              <Button className="w-full font-medium">
                Return to Job Discovery
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <EmployerHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-xl w-full p-8 text-center flex flex-col items-center gap-6 shadow-xl border-border">
            <div className="w-14 h-14 bg-primary/10 border border-primary/30 text-primary rounded-2xl flex items-center justify-center text-2xl">
              🏢
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Select or Create an Organization
              </h2>
              <p className="text-muted-foreground text-sm">
                Nexora uses Clerk B2B Organizations so your entire team can post
                jobs, review candidates, and manage subscriptions together.
              </p>
            </div>

            <div className="w-full flex justify-center py-2">
              <CreateOrganization
                afterCreateOrganizationUrl="/employer/dashboard"
                appearance={{
                  elements: {
                    card: "bg-card border border-border shadow-md text-foreground",
                    headerTitle: "text-foreground font-bold text-xl",
                    headerSubtitle: "text-muted-foreground text-xs",
                    formFieldLabel: "text-foreground text-xs font-semibold",
                    formFieldInput:
                      "bg-background border border-input text-foreground text-xs px-3.5 py-2.5 rounded-xl focus:border-primary",
                    formButtonPrimary:
                      "bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs py-2.5 px-4 rounded-xl transition-opacity shadow-md",
                    formButtonReset:
                      "text-muted-foreground hover:text-foreground text-xs",
                    organizationPreview: "text-foreground",
                    footerActionText: "text-muted-foreground",
                    footerActionLink: "text-primary hover:underline",
                  },
                }}
              />
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <EmployerHeader />
      <main className="flex-1 px-2.5 py-4 sm:p-6 md:p-10 max-w-7xl w-full mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
