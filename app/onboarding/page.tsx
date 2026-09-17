"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const myUser = useQuery(api.users.getMyUser);
  const createMyUser = useMutation(api.users.createMyUser);

  const [selectedRole, setSelectedRole] = useState<
    "candidate" | "employer" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already onboarded, automatically redirect to appropriate section
  useEffect(() => {
    if (myUser) {
      if (myUser.role === "employer") {
        router.replace("/employer/dashboard");
      } else {
        router.replace("/");
      }
    }
  }, [myUser, router]);

  // Loading state while checking authentication or existing user record
  if (!isAuthLoaded || !isUserLoaded || isConvexAuthLoading || (isAuthenticated && myUser === undefined)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium">
            Checking your Nexora account...
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated, prompt to sign in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4 shadow-xl border-border">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center font-bold text-xl">
            🔑
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Sign In Required
          </h2>
          <p className="text-muted-foreground text-sm">
            Please sign in to complete your Nexora onboarding.
          </p>
          <Button
            onClick={() => router.push("/sign-in")}
            className="w-full font-medium mt-2"
          >
            Go to Sign In
          </Button>
        </Card>
      </div>
    );
  }

  const handleSelectRole = async (role: "candidate" | "employer") => {
    if (isSubmitting) return;
    setSelectedRole(role);
    setIsSubmitting(true);

    try {
      await createMyUser({ role });
      toast.success(
        role === "employer"
          ? "Welcome aboard! Redirecting to Employer Dashboard..."
          : "Welcome to Nexora! Redirecting to Job Discovery...",
      );

      if (role === "employer") {
        router.replace("/employer/dashboard");
      } else {
        router.replace("/");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete onboarding",
      );
      setIsSubmitting(false);
      setSelectedRole(null);
    }
  };

  const displayName = clerkUser?.firstName || clerkUser?.fullName || "there";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-border/80 px-6 py-4 flex items-center justify-between bg-card/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-icon.png"
            alt="Nexora Logo"
            width={36}
            height={36}
            className="w-9 h-auto object-contain drop-shadow-sm"
            priority
          />
          <span className="font-extrabold text-2xl tracking-tight text-foreground">
            Nexora
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Onboarding Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto w-full">
        <div className="w-full flex flex-col items-center text-center gap-3 mb-10">
          <Badge
            variant="secondary"
            className="px-3.5 py-1 text-xs font-semibold uppercase tracking-wider gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Welcome to Nexora
          </Badge>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            How will you use Nexora,{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-indigo-500">
              {displayName}
            </span>
            ?
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
            Select how you would like to participate. Your role personalizes
            your dashboard, workflows, and tools.
          </p>
        </div>

        {/* 2 Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Option 1: Candidate (Find a Job) */}
          <Card
            onClick={() => !isSubmitting && handleSelectRole("candidate")}
            className={`cursor-pointer transition-all border-2 relative overflow-hidden group flex flex-col justify-between p-6 sm:p-8 ${
              selectedRole === "candidate"
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border hover:border-primary/50 hover:shadow-lg bg-card"
            }`}
          >
            <CardHeader className="p-0 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">Find a Job</CardTitle>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold uppercase tracking-wider"
                >
                  Candidate
                </Badge>
              </div>
              <CardDescription className="text-sm mt-2 text-muted-foreground leading-relaxed">
                Discover verified career opportunities, filter by roles and work
                modes, bookmark favorites, and apply directly to top companies.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 pt-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
                Search with precision filters
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
                Bookmark & track applications
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
                100% free for job seekers
              </div>

              <Button
                size="lg"
                disabled={isSubmitting}
                className="w-full mt-6 font-bold cursor-pointer transition-all group-hover:bg-primary/90"
              >
                {isSubmitting && selectedRole === "candidate" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up
                    candidate account...
                  </>
                ) : (
                  <>
                    Continue as Candidate{" "}
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Option 2: Employer (Hire Talent) */}
          <Card
            onClick={() => !isSubmitting && handleSelectRole("employer")}
            className={`cursor-pointer transition-all border-2 relative overflow-hidden group flex flex-col justify-between p-6 sm:p-8 ${
              selectedRole === "employer"
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border hover:border-primary/50 hover:shadow-lg bg-card"
            }`}
          >
            <CardHeader className="p-0 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">
                  Hire Talent
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold uppercase tracking-wider"
                >
                  Employer
                </Badge>
              </div>
              <CardDescription className="text-sm mt-2 text-muted-foreground leading-relaxed">
                Create company workspaces, post open positions, review candidate
                applications, and scale your engineering and product teams.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 pt-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
                Publish featured job listings
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
                Manage candidate pipelines
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
                Organization team collaboration
              </div>

              <Button
                size="lg"
                disabled={isSubmitting}
                variant="outline"
                className="w-full mt-6 font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer transition-all"
              >
                {isSubmitting && selectedRole === "employer" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up
                    employer workspace...
                  </>
                ) : (
                  <>
                    Continue as Employer{" "}
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center max-w-md">
          Note: Your role selection is tied to your account and cannot be
          changed later.
        </p>
      </main>
    </div>
  );
}
