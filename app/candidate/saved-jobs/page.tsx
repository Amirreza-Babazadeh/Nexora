"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyJobSchema, ApplyJobFormValues } from "@/lib/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogSkeleton,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Bookmark,
  Trash2,
  ArrowRight,
  MapPin,
  Briefcase,
  Globe,
  Target,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import MainHeader from "@/components/MainHeader";
import { JobCardSkeleton } from "@/components/ui/skeleton-card";
import EmptyState from "@/components/EmptyState";

export default function CandidateSavedJobsPage() {
  const router = useRouter();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const myUser = useQuery(api.users.getMyUser);
  const { user: clerkUser } = useUser();
  const candidateResumes = useQuery(
    api.resumes.getMyResumes,
    isAuthenticated ? {} : "skip"
  );

  const [selectedJobId, setSelectedJobId] = useState<Id<"jobs"> | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // If signed in but user record does not exist in Convex, guide to onboarding
  useEffect(() => {
    if (!isConvexAuthLoading && isAuthenticated && myUser === null) {
      router.push("/onboarding");
    }
  }, [isConvexAuthLoading, isAuthenticated, myUser, router]);

  // Fetch saved jobs with full details
  const savedJobs = useQuery(api.savedJobs.getMySavedJobs);
  const toggleSave = useMutation(api.savedJobs.toggleSaveJob).withOptimisticUpdate(
    (localStore, { jobId }) => {
      const currentJobs = localStore.getQuery(api.savedJobs.getMySavedJobs, {});
      if (currentJobs !== undefined) {
        localStore.setQuery(
          api.savedJobs.getMySavedJobs,
          {},
          currentJobs.filter((item) => item.jobId !== jobId)
        );
      }
    }
  );

  const userEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    myUser?.email ||
    undefined;

  // Query candidate's existing applications
  const myApplications = useQuery(
    api.applications.getMyApplications,
    isAuthenticated ? {} : "skip"
  );

  const appliedJobIdSet = useMemo(() => {
    if (!myApplications?.applications) return new Set<string>();
    return new Set(myApplications.applications.map((app) => app.jobId));
  }, [myApplications]);

  // Check application status for dialog apply button
  const appStatus = useQuery(
    api.applications.checkApplicationStatus,
    selectedJobId ? { jobId: selectedJobId, email: userEmail } : "skip",
  );

  const selectedJob = useQuery(
    api.jobs.getJobById,
    selectedJobId ? { id: selectedJobId } : "skip",
  );

  const submitApp = useMutation(api.applications.submitApplication);

  // Candidate Apply React Hook Form with Zod validation
  const applyForm = useForm<ApplyJobFormValues>({
    resolver: zodResolver(applyJobSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      applicantName: "",
      applicantEmail: "",
      resumeStorageId: "",
      resumeFileName: "",
      resumeUrl: "",
      coverLetter: "",
    },
  });

  // Pre-fill user details and default resume when a job is opened
  useEffect(() => {
    if (selectedJobId) {
      const defaultRes =
        candidateResumes?.find((r) => r.isDefault) || candidateResumes?.[0];
      const name =
        clerkUser?.fullName ||
        myUser?.name ||
        `${myUser?.firstName || ""} ${myUser?.lastName || ""}`.trim();
      const email =
        clerkUser?.primaryEmailAddress?.emailAddress || myUser?.email || "";

      applyForm.reset({
        applicantName: name || "",
        applicantEmail: email || "",
        resumeStorageId: defaultRes?.storageId || "",
        resumeFileName: defaultRes?.fileName || "",
        resumeUrl: "",
        coverLetter: "",
      });
      applyForm.clearErrors();
    }
  }, [selectedJobId, clerkUser, myUser, candidateResumes, applyForm]);

  const handleRemoveSaved = async (jobId: Id<"jobs">) => {
    try {
      await toggleSave({ jobId });
      toast.info("Job removed from saved list");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove saved job",
      );
    }
  };

  const onApplySubmit = async (values: ApplyJobFormValues) => {
    if (!selectedJobId) return;

    const defaultRes =
      candidateResumes?.find((r) => r.isDefault) || candidateResumes?.[0];
    const storageId = values.resumeStorageId || defaultRes?.storageId;
    const fileName = values.resumeFileName || defaultRes?.fileName;

    // Strict client-side pre-flight checks: NEVER send incomplete data to Convex backend
    if (
      appStatus?.hasApplied ||
      (selectedJobId && appliedJobIdSet.has(selectedJobId))
    ) {
      toast.info(
        "You have already submitted an active application for this job listing."
      );
      return;
    }

    if (!values.applicantName?.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!values.applicantEmail?.trim() || !values.applicantEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!storageId && (!values.resumeUrl || !values.resumeUrl.trim())) {
      toast.error("Please attach a resume file or provide a portfolio link.");
      return;
    }
    if (!values.coverLetter?.trim()) {
      toast.error("Please write a note to the hiring team.");
      return;
    }

    try {
      await submitApp({
        jobId: selectedJobId,
        applicantName: values.applicantName.trim(),
        applicantEmail: values.applicantEmail.trim(),
        resumeStorageId: storageId ? (storageId as Id<"_storage">) : undefined,
        resumeFileName: fileName?.trim() || undefined,
        resumeUrl: !storageId ? values.resumeUrl?.trim() : undefined,
        coverLetter: values.coverLetter?.trim() || undefined,
      });
      setSubmitSuccess(true);
      toast.success("Application submitted successfully!");
      setTimeout(() => {
        setSubmitSuccess(false);
        setSelectedJobId(null);
        applyForm.reset();
      }, 2000);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit application",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navigation Header */}
      <MainHeader />

      {/* Main Page Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              Saved Jobs
              {savedJobs && savedJobs.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold px-2.5 py-0.5"
                >
                  {savedJobs.length} {savedJobs.length === 1 ? "Job" : "Jobs"}
                </Badge>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Positions you have bookmarked for later review and application.
            </p>
          </div>

          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium gap-1.5 self-start sm:self-auto"
            >
              Explore More Jobs <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Content Loading State */}
        {savedJobs === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <JobCardSkeleton key={n} />
            ))}
          </div>
        ) : savedJobs.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={Bookmark}
            title="No saved jobs yet"
            description="You haven't bookmarked any jobs yet. Bookmark open positions while browsing to keep track of roles you're interested in!"
            actionLabel="Explore Open Jobs"
            actionHref="/"
          />
        ) : (
          /* Saved Jobs Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map((item) => {
              const isClosed = item.jobStatus === "closed";
              return (
                <Card
                  key={item._id}
                  className={`flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm hover:shadow-md ${
                    item.isFeatured
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0">
                          {item.companyName[0] || "🏢"}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold line-clamp-1">
                            {item.jobTitle}
                          </CardTitle>
                          <CardDescription className="text-xs font-medium">
                            {item.companyName}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isClosed ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px] uppercase font-bold tracking-wider"
                          >
                            Closed
                          </Badge>
                        ) : item.isFeatured ? (
                          <Badge
                            variant="default"
                            className="text-[10px] uppercase font-bold tracking-wider"
                          >
                            Featured
                          </Badge>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleRemoveSaved(item.jobId)}
                          className="p-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer"
                          title="Remove bookmark"
                          aria-label="Remove bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4">
                    <div className="flex items-center flex-wrap gap-1.5 text-xs">
                      <Badge
                        variant="outline"
                        className="font-normal text-[11px] gap-1"
                      >
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {item.location}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="font-medium text-[11px] capitalize gap-1"
                      >
                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                        {item.employmentType || item.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-medium text-[11px] capitalize gap-1"
                      >
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        {item.workMode}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-medium text-[11px] capitalize text-primary border-primary/30 gap-1"
                      >
                        <Target className="w-3 h-3 text-primary" />
                        {item.experienceLevel}
                      </Badge>
                      {item.salaryMin && item.salaryMax && (
                        <Badge
                          variant="secondary"
                          className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 gap-1"
                        >
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          ${item.salaryMin.toLocaleString()} - $
                          {item.salaryMax.toLocaleString()}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-2 text-[11px] text-muted-foreground/80 flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-primary" />
                      <span>
                        Saved on{" "}
                        {new Date(item.savedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Button
                      onClick={() => setSelectedJobId(item.jobId)}
                      disabled={isClosed}
                      className="w-full font-bold text-xs cursor-pointer"
                      variant={
                        isClosed
                          ? "secondary"
                          : appliedJobIdSet.has(item.jobId)
                            ? "secondary"
                            : "default"
                      }
                    >
                      {isClosed ? (
                        "Position Closed"
                      ) : appliedJobIdSet.has(item.jobId) ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                          Applied (View Details)
                        </>
                      ) : (
                        "View Details & Apply"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Quick Application Modal */}
      <Dialog
        open={!!selectedJobId}
        onOpenChange={(open) => !open && setSelectedJobId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {selectedJob?.title}
              {selectedJob?.isFeatured && (
                <Badge variant="default" className="text-[10px]">
                  Featured
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold flex flex-wrap items-center gap-2 pt-1">
              <span>{selectedJob?.companyName}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                {selectedJob?.location}
              </span>
              <span>•</span>
              <span className="capitalize">
                {selectedJob?.employmentType || selectedJob?.type}
              </span>
              <span>•</span>
              <span className="capitalize">
                {selectedJob?.workMode || "Onsite"}
              </span>
              <span>•</span>
              <span className="capitalize">
                {selectedJob?.experienceLevel || "Mid"} Level
              </span>
            </DialogDescription>
          </DialogHeader>

          {!selectedJob ? (
            <DialogSkeleton rows={5} />
          ) : (
            <div className="space-y-6 py-2">
              <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  About the Role
                </h4>
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                  {selectedJob.description}
                </p>

                {selectedJob.requirements &&
                  selectedJob.requirements.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Requirements
                      </h4>
                      <ul className="list-disc list-inside text-xs space-y-1 text-foreground/80">
                        {selectedJob.requirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Application Form */}
              <div className="space-y-4">
                <h3 className="text-base font-bold border-b border-border pb-2">
                  Submit Your Application
                </h3>

                {submitSuccess ? (
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                      ✓
                    </div>
                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400">
                      Application Submitted!
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      The employer will review your profile and reach out
                      directly.
                    </p>
                  </div>
                ) : appStatus?.isAuthor ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-medium text-center">
                    ⚠️ You posted this job listing from your organization. You
                    cannot apply to your own position.
                  </div>
                ) : appStatus?.hasApplied ||
                  (selectedJobId && appliedJobIdSet.has(selectedJobId)) ? (
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-lg">
                      ✓
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">
                        Application Already Submitted
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        You have already submitted an application for this
                        position. You can track its live status in My
                        Applications.
                      </p>
                    </div>
                    <div className="pt-1">
                      <Link href="/candidate/applications">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          Track in My Applications →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Form {...applyForm}>
                    <form
                      onSubmit={applyForm.handleSubmit(onApplySubmit, (errors) => {
                        const firstError =
                          errors.applicantName?.message ||
                          errors.applicantEmail?.message ||
                          errors.resumeStorageId?.message ||
                          errors.resumeUrl?.message ||
                          "Please complete all required fields before submitting.";
                        toast.error(firstError);
                      })}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={applyForm.control}
                          name="applicantName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">
                                Full Name *
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Jane Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={applyForm.control}
                          name="applicantEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">
                                Email Address *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="jane@example.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {candidateResumes && candidateResumes.length > 0 && (
                        <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                          <span className="font-semibold flex items-center gap-1.5 text-primary">
                            ✓ Attached Resume: {candidateResumes.find((r) => r.isDefault)?.fileName || candidateResumes[0]?.fileName}
                          </span>
                        </div>
                      )}

                      <FormField
                        control={applyForm.control}
                        name="resumeUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              {candidateResumes && candidateResumes.length > 0
                                ? "Or Portfolio / External Resume Link"
                                : "Resume / Portfolio Link *"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://linkedin.com/in/... or github link"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {applyForm.formState.errors.resumeStorageId && (
                        <p className="text-xs font-semibold text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                          {applyForm.formState.errors.resumeStorageId.message}
                        </p>
                      )}

                      <FormField
                        control={applyForm.control}
                        name="coverLetter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Cover Note / Introduction *
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Share why you're a great fit for this position..."
                                className="min-h-22.5"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedJobId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            applyForm.formState.isSubmitting ||
                            Boolean(
                              appStatus?.hasApplied ||
                                (selectedJobId &&
                                  appliedJobIdSet.has(selectedJobId))
                            )
                          }
                          className="gap-2 shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        >
                          {applyForm.formState.isSubmitting
                            ? "Submitting..."
                            : "Send Application"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
