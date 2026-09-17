"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ChevronRight,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSkeleton,
  DialogTitle,
} from "@/components/ui/dialog";
import MainHeader from "@/components/MainHeader";

type StatusType =
  | "submitted"
  | "under_review"
  | "interviewing"
  | "rejected"
  | "hired"
  | "withdrawn";

interface CandidateApplication {
  _id: string;
  _creationTime: number;
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: StatusType | string;
  appliedAt: number;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  type: string;
  category: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  jobStatus: "active" | "draft" | "closed" | string;
}

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const myUser = useQuery(api.users.getMyUser);

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<CandidateApplication | null>(null);
  const [appToWithdraw, setAppToWithdraw] = useState<CandidateApplication | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const withdrawApp = useMutation(
    api.applications.withdrawApplication,
  ).withOptimisticUpdate((localStore, { id }) => {
    const current = localStore.getQuery(api.applications.getMyApplications, {});
    if (current) {
      const target = current.applications.find((a) => a._id === id);
      const statusKey = target?.status as keyof typeof current | undefined;
      const currentCount =
        statusKey && typeof current[statusKey] === "number"
          ? (current[statusKey] as number)
          : 1;
      localStore.setQuery(api.applications.getMyApplications, {}, {
        ...current,
        total: Math.max(0, current.total - 1),
        ...(statusKey ? { [statusKey]: Math.max(0, currentCount - 1) } : {}),
        applications: current.applications.filter((a) => a._id !== id),
      });
    }
  });

  const handleConfirmWithdraw = async () => {
    if (!appToWithdraw) return;
    setIsWithdrawing(true);
    try {
      await withdrawApp({ id: appToWithdraw._id as Id<"applications"> });
      toast.success("Application withdrawn and removed from your list");
      setAppToWithdraw(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to withdraw application"
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  // If signed in but user record does not exist in Convex, guide to onboarding
  useEffect(() => {
    if (!isConvexAuthLoading && isAuthenticated && myUser === null) {
      router.push("/onboarding");
    }
  }, [isConvexAuthLoading, isAuthenticated, myUser, router]);

  // Fetch real-time applications for the authenticated candidate
  const data = useQuery(api.applications.getMyApplications);

  const getStatusBadge = (status: StatusType | string) => {
    switch (status) {
      case "submitted":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold px-2.5 py-0.5"
          >
            <Clock className="w-3 h-3 mr-1 inline" /> Submitted
          </Badge>
        );
      case "under_review":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold px-2.5 py-0.5"
          >
            <Search className="w-3 h-3 mr-1 inline" /> Under Review
          </Badge>
        );
      case "interviewing":
        return (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold px-2.5 py-0.5"
          >
            <Sparkles className="w-3 h-3 mr-1 inline" /> Interviewing
          </Badge>
        );
      case "hired":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold px-2.5 py-0.5"
          >
            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Hired 🎉
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold px-2.5 py-0.5"
          >
            <AlertCircle className="w-3 h-3 mr-1 inline" /> Not Selected
          </Badge>
        );
      case "withdrawn":
        return (
          <Badge
            variant="outline"
            className="bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20 font-semibold px-2.5 py-0.5"
          >
            <XCircle className="w-3 h-3 mr-1 inline" /> Withdrawn
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPipelineStepIndex = (status: StatusType | string) => {
    switch (status) {
      case "submitted":
        return 0;
      case "under_review":
        return 1;
      case "interviewing":
        return 2;
      case "hired":
      case "rejected":
        return 3;
      default:
        return 0;
    }
  };

  const filteredApps: CandidateApplication[] =
    (data?.applications as CandidateApplication[] | undefined)?.filter((app) => {
      if (selectedStatus === "all") return true;
      return app.status === selectedStatus;
    }) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navigation Header */}
      <MainHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-10 flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <Briefcase className="w-3.5 h-3.5" /> Candidate Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              My Applications
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Track the progress and status of all positions you have applied for in real time.
            </p>
          </div>

          <Link href="/">
            <Button className="font-semibold shadow-sm gap-2">
              <Search className="w-4 h-4" /> Explore More Jobs
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {data === undefined ? (
          <div className="flex flex-col gap-6 animate-pulse">
            {/* Metric Skeletons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-card rounded-xl border border-border" />
              ))}
            </div>

            {/* List Skeletons */}
            <div className="flex flex-col gap-4 mt-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 bg-card rounded-xl border border-border" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card
                className={`cursor-pointer transition-all border-border ${
                  selectedStatus === "all"
                    ? "ring-2 ring-primary bg-primary/5 shadow-sm"
                    : "hover:bg-accent/40"
                }`}
                onClick={() => setSelectedStatus("all")}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Applied
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-foreground">
                      {data.total}
                    </span>
                    <Briefcase className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all border-border ${
                  selectedStatus === "submitted"
                    ? "ring-2 ring-blue-500 bg-blue-500/5 shadow-sm"
                    : "hover:bg-accent/40"
                }`}
                onClick={() => setSelectedStatus("submitted")}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Submitted
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-foreground">
                      {data.submitted}
                    </span>
                    <Clock className="w-4 h-4 text-blue-500/60" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all border-border ${
                  selectedStatus === "under_review"
                    ? "ring-2 ring-amber-500 bg-amber-500/5 shadow-sm"
                    : "hover:bg-accent/40"
                }`}
                onClick={() => setSelectedStatus("under_review")}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Under Review
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-foreground">
                      {data.under_review}
                    </span>
                    <Search className="w-4 h-4 text-amber-500/60" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all border-border ${
                  selectedStatus === "interviewing"
                    ? "ring-2 ring-purple-500 bg-purple-500/5 shadow-sm"
                    : "hover:bg-accent/40"
                }`}
                onClick={() => setSelectedStatus("interviewing")}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Interviewing
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-foreground">
                      {data.interviewing}
                    </span>
                    <Sparkles className="w-4 h-4 text-purple-500/60" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all border-border col-span-2 sm:col-span-1 ${
                  selectedStatus === "hired"
                    ? "ring-2 ring-emerald-500 bg-emerald-500/5 shadow-sm"
                    : "hover:bg-accent/40"
                }`}
                onClick={() => setSelectedStatus("hired")}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Offers / Hired
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-foreground">
                      {data.hired}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Applications List or Empty State */}
            {filteredApps.length === 0 ? (
              <Card className="border-dashed border-2 border-border p-12 text-center flex flex-col items-center justify-center gap-4 bg-card/40">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground shadow-xs">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedStatus === "all"
                      ? "No applications yet"
                      : `No applications in "${selectedStatus.replace("_", " ")}"`}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {selectedStatus === "all"
                      ? "You haven't submitted any job applications yet. Start exploring active job listings from top organizations today!"
                      : `You currently have no submitted applications with the status "${selectedStatus.replace("_", " ")}".`}
                  </p>
                </div>
                <Link href="/">
                  <Button className="mt-2 font-semibold shadow-sm gap-2">
                    <Search className="w-4 h-4" /> Browse Open Positions
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredApps.map((app) => {
                  const stepIndex = getPipelineStepIndex(app.status);
                  return (
                    <Card
                      key={app._id}
                      className="border-border hover:border-primary/40 transition-all shadow-xs hover:shadow-md bg-card flex flex-col justify-between overflow-hidden"
                    >
                      <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-xl shrink-0 shadow-2xs">
                            {app.companyLogo ? (
                              <span>{app.companyLogo}</span>
                            ) : (
                              <Building2 className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                                {app.jobTitle}
                              </CardTitle>
                              {app.jobStatus === "closed" && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Position Closed
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-sm font-medium text-foreground/80 flex items-center gap-1.5 mt-0.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              {app.companyName}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {getStatusBadge(app.status)}
                        </div>
                      </CardHeader>

                      <CardContent className="py-2 flex flex-col gap-4">
                        {/* Job Details Meta Row */}
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{app.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="capitalize">{app.type}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>
                              Applied on {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          {app.salaryMin && app.salaryMax && (
                            <div className="flex items-center gap-1 text-foreground font-semibold">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              <span>
                                ${app.salaryMin.toLocaleString()} - ${app.salaryMax.toLocaleString()}{" "}
                                {app.salaryCurrency}
                              </span>
                            </div>
                          )}
                        </div>

                        {app.status === "rejected" ? (
                          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 mt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
                              <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                              <span>Application Closed &bull; Not Selected</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              Thank you for applying. Keep exploring open positions!
                            </span>
                          </div>
                        ) : (
                          /* Visual Progress Stepper */
                          <div className="bg-muted/30 border border-border/50 rounded-xl p-3 mt-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2 px-1">
                              <span className={stepIndex >= 0 ? "text-primary font-bold" : ""}>
                                1. Submitted
                              </span>
                              <span className={stepIndex >= 1 ? "text-amber-500 font-bold" : ""}>
                                2. Under Review
                              </span>
                              <span className={stepIndex >= 2 ? "text-purple-500 font-bold" : ""}>
                                3. Interviewing
                              </span>
                              <span
                                className={
                                  app.status === "hired"
                                    ? "text-emerald-500 font-bold"
                                    : ""
                                }
                              >
                                4. Decision
                              </span>
                            </div>

                            <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden flex">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  app.status === "hired"
                                    ? "bg-emerald-500"
                                    : app.status === "interviewing"
                                    ? "bg-purple-500"
                                    : app.status === "under_review"
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                                }`}
                                style={{
                                  width:
                                    app.status === "hired"
                                      ? "100%"
                                      : app.status === "interviewing"
                                      ? "75%"
                                      : app.status === "under_review"
                                      ? "50%"
                                      : "25%",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="pt-2 pb-4 border-t border-border/40 flex items-center justify-between gap-2 mt-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApp(app)}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Details
                        </Button>

                        <div className="flex items-center gap-2">
                          {(app.status === "submitted" ||
                            app.status === "under_review" ||
                            app.status === "interviewing") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAppToWithdraw(app)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Withdraw
                            </Button>
                          )}

                          <Link href="/">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold gap-1"
                            >
                              Explore Jobs <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* View Submission Details Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Application Details
            </DialogTitle>
            <DialogDescription>
              Details submitted for{" "}
              <span className="font-semibold text-foreground">
                {selectedApp?.jobTitle}
              </span>{" "}
              at {selectedApp?.companyName}.
            </DialogDescription>
          </DialogHeader>

          {!selectedApp ? (
            <DialogSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-4 py-2 text-sm">
              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Application Status</span>
                  <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Submission Date</span>
                  <span className="text-xs font-semibold text-foreground">
                    {new Date(selectedApp.appliedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-1">
                  Applicant Contact
                </span>
                <p className="font-medium text-foreground">{selectedApp.applicantName}</p>
                <p className="text-xs text-muted-foreground">{selectedApp.applicantEmail}</p>
              </div>

              {selectedApp.resumeUrl && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                    Resume / Portfolio Link
                  </span>
                  <a
                    href={selectedApp.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {selectedApp.resumeUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {selectedApp.coverLetter && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                    Cover Letter & Notes
                  </span>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border/60 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {selectedApp.coverLetter}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Confirmation Dialog */}
      <Dialog
        open={!!appToWithdraw}
        onOpenChange={(open) => !open && setAppToWithdraw(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Withdraw Application?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to cancel and withdraw your application for{" "}
              <strong className="text-foreground font-semibold">
                {appToWithdraw?.jobTitle}
              </strong>{" "}
              at{" "}
              <strong className="text-foreground font-semibold">
                {appToWithdraw?.companyName}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1">
            <p className="font-semibold">⚠️ What happens next:</p>
            <p>
              This application will be removed from your applications list and the employer will be notified that you withdrew. You can re-apply anytime if the position is open.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAppToWithdraw(null)}
              disabled={isWithdrawing}
            >
              Keep Application
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmWithdraw}
              disabled={isWithdrawing}
              className="font-bold gap-1.5"
            >
              {isWithdrawing ? "Withdrawing..." : "Yes, Withdraw & Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
