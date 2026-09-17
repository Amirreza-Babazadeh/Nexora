"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyJobSchema, ApplyJobFormValues } from "@/lib/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bookmark,
  FileText,
  UploadCloud,
  Star,
  Loader2,
  X,
  MapPin,
  Briefcase,
  Globe,
  Target,
  DollarSign,
  CheckCircle2,
  Search,
} from "lucide-react";
import { JobCardSkeleton } from "@/components/ui/skeleton-card";
import EmptyState from "@/components/EmptyState";
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
import { toast } from "sonner";
import MainHeader from "@/components/MainHeader";

export default function B2CLandingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const myUser = useQuery(api.users.getMyUser);

  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("all");
  const [selectedWorkMode, setSelectedWorkMode] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<Id<"jobs"> | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Guide authenticated users without a Convex user record to /onboarding
  useEffect(() => {
    if (!isConvexAuthLoading && isAuthenticated && myUser === null) {
      router.push("/onboarding");
    }
  }, [isConvexAuthLoading, isAuthenticated, myUser, router]);

  // 300ms Debounce for title/company keyword search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 300ms Debounce for location search
  const [debouncedLocation, setDebouncedLocation] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocation(locationTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [locationTerm]);

  const isDebouncing =
    searchTerm !== debouncedSearch || locationTerm !== debouncedLocation;

  const activeFilterCount =
    (debouncedSearch.trim() !== "" ? 1 : 0) +
    (debouncedLocation.trim() !== "" ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedEmploymentType !== "all" ? 1 : 0) +
    (selectedWorkMode !== "all" ? 1 : 0) +
    (selectedExperience !== "all" ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const BATCH_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const resetAllFilters = () => {
    setSearchTerm("");
    setLocationTerm("");
    setSelectedCategory("all");
    setSelectedEmploymentType("all");
    setSelectedWorkMode("all");
    setSelectedExperience("all");
    setVisibleCount(BATCH_SIZE);
  };

  const filterKey = `${debouncedSearch}|${debouncedLocation}|${selectedCategory}|${selectedEmploymentType}|${selectedWorkMode}|${selectedExperience}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(BATCH_SIZE);
  }

  // Fetch jobs from Convex using debounced search terms & multi-dimension filters
  const jobs = useQuery(api.jobs.listPublicJobs, {
    search: debouncedSearch,
    location: debouncedLocation,
    category: selectedCategory,
    employmentType: selectedEmploymentType,
    workMode: selectedWorkMode,
    experienceLevel: selectedExperience,
  });

  const visibleJobs = jobs ? jobs.slice(0, visibleCount) : undefined;
  const hasMore = jobs ? visibleCount < jobs.length : false;

  // Infinite scroll observer: triggers loading next batch when user scrolls near the end
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + BATCH_SIZE);
        }
      },
      { rootMargin: "250px" },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasMore, visibleCount]);

  // Fetch saved job IDs for batch O(1) membership check
  const savedJobIds = useQuery(api.savedJobs.getMySavedJobIds);
  const savedJobIdSet = new Set(savedJobIds ?? []);
  const toggleSave = useMutation(api.savedJobs.toggleSaveJob).withOptimisticUpdate(
    (localStore, { jobId }) => {
      const currentIds = localStore.getQuery(api.savedJobs.getMySavedJobIds, {});
      if (currentIds !== undefined) {
        const alreadySaved = currentIds.includes(jobId);
        const nextIds = alreadySaved
          ? currentIds.filter((id) => id !== jobId)
          : [...currentIds, jobId];
        localStore.setQuery(api.savedJobs.getMySavedJobIds, {}, nextIds);
      }
    }
  );
  const [savingJobIds, setSavingJobIds] = useState<Set<string>>(new Set());

  const selectedJob = useQuery(
    api.jobs.getJobById,
    selectedJobId ? { id: selectedJobId } : "skip",
  );

  const appStatus = useQuery(
    api.applications.checkApplicationStatus,
    selectedJobId ? { jobId: selectedJobId } : "skip",
  );

  const submitApp = useMutation(api.applications.submitApplication);

  // Candidate Resumes & Direct Upload for 1-Click Apply
  const candidateResumes = useQuery(
    api.resumes.getMyResumes,
    isSignedIn ? {} : "skip",
  );
  const syncIdentity = useMutation(api.users.syncMyUserIdentity);
  const generateUploadUrl = useMutation(api.resumes.generateResumeUploadUrl);
  const createResume = useMutation(api.resumes.createResume);

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleSave = async (jobId: Id<"jobs">) => {
    if (savingJobIds.has(jobId)) return;
    setSavingJobIds((prev) => new Set(prev).add(jobId));

    try {
      const res = await toggleSave({ jobId });
      if (res.saved) {
        toast.success("Job saved to your bookmarks!");
      } else {
        toast.info("Job removed from saved list");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update saved job",
      );
    } finally {
      setSavingJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedSearch(searchTerm);
    setDebouncedLocation(locationTerm);
    const resultsElement = document.getElementById("results");
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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

  // Resolve authentic candidate name (filtering out placeholder "User")
  const resolvedName = (() => {
    const clerkFullName = clerkUser?.fullName?.trim();
    if (clerkFullName && clerkFullName.toLowerCase() !== "user")
      return clerkFullName;

    const clerkParts =
      `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim();
    if (clerkParts && clerkParts.toLowerCase() !== "user") return clerkParts;

    const convexName = myUser?.name?.trim();
    if (convexName && convexName.toLowerCase() !== "user") return convexName;

    const convexParts =
      `${myUser?.firstName || ""} ${myUser?.lastName || ""}`.trim();
    if (convexParts && convexParts.toLowerCase() !== "user") return convexParts;

    if (clerkFullName) return clerkFullName;
    return "";
  })();

  // Resolve authentic candidate email from Clerk primary email or Convex
  const resolvedEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    myUser?.email ||
    "";

  // Auto-sync authentic Clerk profile into Convex record if it was saved with placeholder "User" or missing email
  useEffect(() => {
    if (isSignedIn && clerkUser && myUser) {
      const needsNameSync =
        (!myUser.name ||
          myUser.name === "User" ||
          myUser.firstName === "User") &&
        Boolean(clerkUser.fullName);
      const needsEmailSync =
        (!myUser.email || myUser.email.trim() === "") &&
        Boolean(clerkUser.primaryEmailAddress?.emailAddress);

      if (needsNameSync || needsEmailSync) {
        syncIdentity({
          name: clerkUser.fullName || undefined,
          email: clerkUser.primaryEmailAddress?.emailAddress || undefined,
          imageUrl: clerkUser.imageUrl || undefined,
        }).catch(() => {});
      }
    }
  }, [isSignedIn, clerkUser, myUser, syncIdentity]);

  const handleOpenApply = (jobId: Id<"jobs">) => {
    setSelectedJobId(jobId);
    setSelectedResumeId(null);
    setUseCustomUrl(false);

    const defaultRes =
      candidateResumes?.find((r) => r.isDefault) || candidateResumes?.[0];

    applyForm.reset({
      applicantName: resolvedName,
      applicantEmail: resolvedEmail,
      resumeStorageId: defaultRes?.storageId || "",
      resumeFileName: defaultRes?.fileName || "",
      resumeUrl: "",
      coverLetter: "",
    });
    applyForm.clearErrors();
  };

  // Sync candidate contact information if user profile finishes loading after modal opened
  useEffect(() => {
    if (!selectedJobId) return;

    const currentName = applyForm.getValues("applicantName");
    if (
      resolvedName &&
      (!currentName ||
        currentName.trim() === "" ||
        currentName.trim().toLowerCase() === "user")
    ) {
      applyForm.setValue("applicantName", resolvedName, { shouldValidate: true });
    }

    const currentEmail = applyForm.getValues("applicantEmail");
    if (resolvedEmail && (!currentEmail || currentEmail.trim() === "")) {
      applyForm.setValue("applicantEmail", resolvedEmail, { shouldValidate: true });
    }
  }, [selectedJobId, resolvedName, resolvedEmail, applyForm]);

  // Sync candidate default resume if resumes load while modal is open
  useEffect(() => {
    if (
      selectedJobId &&
      candidateResumes &&
      candidateResumes.length > 0 &&
      !useCustomUrl &&
      !applyForm.getValues("resumeStorageId")
    ) {
      const defaultRes =
        candidateResumes.find((r) => r.isDefault) || candidateResumes[0];
      if (defaultRes) {
        applyForm.setValue("resumeStorageId", defaultRes.storageId, { shouldValidate: true });
        applyForm.setValue("resumeFileName", defaultRes.fileName, { shouldValidate: true });
      }
    }
  }, [selectedJobId, candidateResumes, useCustomUrl, applyForm]);

  const handleSelectResume = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    const chosen = candidateResumes?.find((r) => r._id === resumeId);
    if (chosen) {
      applyForm.setValue("resumeStorageId", chosen.storageId, { shouldValidate: true });
      applyForm.setValue("resumeFileName", chosen.fileName, { shouldValidate: true });
      applyForm.setValue("resumeUrl", "", { shouldValidate: true });
      setUseCustomUrl(false);
    }
  };

  const handleInlineResumeUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds the 5 MB limit.");
      return;
    }

    try {
      setIsUploadingInline(true);
      const uploadUrl = await generateUploadUrl();
      const mimeType = file.type || "application/pdf";
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload binary file to secure storage.");
      }

      const { storageId } = await uploadRes.json();
      const newResumeId = await createResume({
        storageId,
        fileName: file.name.trim(),
        fileSize: file.size,
        mimeType,
      });

      setSelectedResumeId(newResumeId);
      applyForm.setValue("resumeStorageId", storageId);
      applyForm.setValue("resumeFileName", file.name.trim());
      applyForm.setValue("resumeUrl", "");
      setUseCustomUrl(false);
      toast.success(`Resume "${file.name}" uploaded and attached!`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload resume file",
      );
    } finally {
      setIsUploadingInline(false);
      if (inlineFileInputRef.current) {
        inlineFileInputRef.current.value = "";
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onApplySubmit = async (values: ApplyJobFormValues) => {
    if (!selectedJobId) return;

    const currentResume =
      (selectedResumeId
        ? candidateResumes?.find((r) => r._id === selectedResumeId)
        : undefined) ||
      candidateResumes?.find((r) => r.isDefault) ||
      candidateResumes?.[0];

    const storageId = !useCustomUrl
      ? values.resumeStorageId || currentResume?.storageId
      : undefined;
    const fileName = !useCustomUrl
      ? values.resumeFileName || currentResume?.fileName
      : undefined;

    // Strict client-side pre-flight checks: NEVER send incomplete data to Convex backend
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
        resumeUrl:
          useCustomUrl || !storageId ? values.resumeUrl?.trim() : undefined,
        coverLetter: values.coverLetter?.trim() || undefined,
      });
      setSubmitSuccess(true);
      toast.success("Application submitted successfully!");
      setTimeout(() => {
        setSubmitSuccess(false);
        setSelectedJobId(null);
        setSelectedResumeId(null);
        setUseCustomUrl(false);
        applyForm.reset();
      }, 2000);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit application",
      );
    }
  };

  const categories = [
    "all",
    "Engineering",
    "Design",
    "Marketing",
    "Sales",
    "Other",
  ];
  const employmentTypes = [
    { value: "all", label: "All Types" },
    { value: "full-time", label: "Full Time" },
    { value: "part-time", label: "Part Time" },
    { value: "contract", label: "Contract" },
    { value: "internship", label: "Internship" },
  ];
  const workModes = [
    { value: "all", label: "All Modes" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "Onsite" },
  ];
  const experienceLevels = [
    { value: "all", label: "All Levels" },
    { value: "entry", label: "Entry" },
    { value: "junior", label: "Junior" },
    { value: "mid", label: "Mid" },
    { value: "senior", label: "Senior" },
    { value: "lead", label: "Lead" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      <MainHeader />

      {/* Hero Search Section */}
      <section className="bg-linear-to-b from-card via-card/80 to-background border-b border-border/80 py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <Badge
            variant="secondary"
            className="px-3.5 py-1 text-xs font-semibold uppercase tracking-wider"
          >
            🔥 Find your dream job today
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-tight">
            Search Thousands of{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-indigo-500">
              Top Career Opportunities
            </span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
            Explore verified job listings with multi-dimensional filtering
            across roles, work modes, and experience levels.
          </p>

          {/* Search Inputs Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full max-w-3xl">
            <Card className="w-full border-border p-3 shadow-2xl flex flex-col md:flex-row items-center gap-2 mt-4 bg-card/90">
              <div className="flex-1 w-full flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-xl border border-border/60">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="text"
                  placeholder="Job title, keywords, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoComplete="off"
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm"
                />
              </div>

              <div className="flex-1 w-full flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-xl border border-border/60">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="text"
                  placeholder="City, state, or 'Remote'..."
                  value={locationTerm}
                  onChange={(e) => setLocationTerm(e.target.value)}
                  autoComplete="off"
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full md:w-auto font-bold shrink-0 cursor-pointer"
              >
                Search Jobs
              </Button>
            </Card>
          </form>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
            <span className="text-xs text-muted-foreground font-medium mr-1">
              Categories:
            </span>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <Button
                  key={cat}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/80"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area: Job Listings Grid & Filter Toolbar */}
      <main
        id="results"
        className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-6 scroll-mt-6"
      >
        {/* Secondary Filter Toolbar */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
          {/* Main Filter Groups in One Single Line */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 md:gap-4 overflow-x-auto pb-1 scrollbar-none w-full">
            {/* Employment Type Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-muted-foreground">
                Type:
              </span>
              <div className="flex items-center gap-1 bg-muted/80 dark:bg-muted/40 p-1 rounded-xl border border-border/70">
                {employmentTypes.map((et) => {
                  const isActive = selectedEmploymentType === et.value;
                  return (
                    <Button
                      key={et.value}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedEmploymentType(et.value)}
                      className={`text-xs h-7 px-2.5 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/80 font-medium"
                      }`}
                    >
                      {et.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Work Mode Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-muted-foreground">
                Mode:
              </span>
              <div className="flex items-center gap-1 bg-muted/80 dark:bg-muted/40 p-1 rounded-xl border border-border/70">
                {workModes.map((wm) => {
                  const isActive = selectedWorkMode === wm.value;
                  return (
                    <Button
                      key={wm.value}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedWorkMode(wm.value)}
                      className={`text-xs h-7 px-2.5 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/80 font-medium"
                      }`}
                    >
                      {wm.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Experience Level Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-muted-foreground">
                Exp:
              </span>
              <div className="flex items-center gap-1 bg-muted/80 dark:bg-muted/40 p-1 rounded-xl border border-border/70">
                {experienceLevels.map((el) => {
                  const isActive = selectedExperience === el.value;
                  return (
                    <Button
                      key={el.value}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedExperience(el.value)}
                      className={`text-xs h-7 px-2.5 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/80 font-medium"
                      }`}
                    >
                      {el.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              Active Filters:
            </span>

            {searchTerm.trim() && (
              <Badge
                variant="secondary"
                className="pl-2.5 pr-1.5 py-1 text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span>&ldquo;{searchTerm.trim()}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="hover:bg-primary/30 rounded-full p-0.5 transition-colors cursor-pointer"
                  title="Remove keyword filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {locationTerm.trim() && (
              <Badge
                variant="secondary"
                className="pl-2.5 pr-1.5 py-1 text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  {locationTerm.trim()}
                </span>
                <button
                  type="button"
                  onClick={() => setLocationTerm("")}
                  className="hover:bg-primary/30 rounded-full p-0.5 transition-colors cursor-pointer"
                  title="Remove location filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {selectedCategory !== "all" && (
              <Badge
                variant="secondary"
                className="pl-2.5 pr-1.5 py-1 text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span>{selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="hover:bg-primary/30 rounded-full p-0.5 transition-colors cursor-pointer"
                  title="Remove category filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {selectedEmploymentType !== "all" && (
              <Badge
                variant="secondary"
                className="pl-2.5 pr-1.5 py-1 text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span>
                  {employmentTypes.find((e) => e.value === selectedEmploymentType)?.label ||
                    selectedEmploymentType}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEmploymentType("all")}
                  className="hover:bg-primary/30 rounded-full p-0.5 transition-colors cursor-pointer"
                  title="Remove employment type filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {selectedWorkMode !== "all" && (
              <Badge
                variant="secondary"
                className="pl-2.5 pr-1.5 py-1 text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span>
                  {workModes.find((w) => w.value === selectedWorkMode)?.label ||
                    selectedWorkMode}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedWorkMode("all")}
                  className="hover:bg-primary/30 rounded-full p-0.5 transition-colors cursor-pointer"
                  title="Remove work mode filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {selectedExperience !== "all" && (
              <Badge
                variant="secondary"
                className="pl-2.5 pr-1.5 py-1 text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span>
                  {experienceLevels.find((e) => e.value === selectedExperience)?.label ||
                    selectedExperience}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedExperience("all")}
                  className="hover:bg-primary/30 rounded-full p-0.5 transition-colors cursor-pointer"
                  title="Remove experience level filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="text-xs h-7 text-muted-foreground hover:text-foreground cursor-pointer font-medium ml-1"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">
                Active Opportunities
              </h2>
              {isDebouncing && (
                <Badge
                  variant="secondary"
                  className="text-[10px] animate-pulse"
                >
                  Updating...
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDebouncing
                ? "Updating search results..."
                : jobs && jobs.length > 0
                  ? `Showing ${visibleJobs?.length ?? 0} of ${jobs.length} active ${jobs.length === 1 ? "opportunity" : "opportunities"}`
                  : "0 active opportunities"}
            </p>
          </div>
        </div>

        {/* Loading Skeleton or Empty State or Results Grid */}
        {jobs === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <JobCardSkeleton key={n} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              hasActiveFilters
                ? "No matching opportunities found"
                : "No active jobs available"
            }
            description={
              hasActiveFilters
                ? "No active job listings match your selected search criteria. Try broadening your keywords or removing active filter chips."
                : "There are currently no active job postings available on Nexora. Check back soon for new openings!"
            }
            actionLabel={hasActiveFilters ? "Reset All Filters" : undefined}
            onActionClick={hasActiveFilters ? resetAllFilters : undefined}
          />
        ) : (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${isDebouncing ? "opacity-60" : "opacity-100"}`}
          >
            {visibleJobs?.map((job) => {
              const isSaved = savedJobIdSet.has(job._id);
              const isSavingThis = savingJobIds.has(job._id);
              const empType = job.employmentType || job.type || "full-time";
              const workMode =
                job.workMode ||
                (job.location.toLowerCase().includes("remote")
                  ? "remote"
                  : "onsite");
              const expLevel = job.experienceLevel || "mid";

              return (
                <Card
                  key={job._id}
                  className={`flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm hover:shadow-md ${
                    job.isFeatured
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0">
                          {job.companyName[0]}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold line-clamp-1">
                            {job.title}
                          </CardTitle>
                          <CardDescription className="text-xs font-medium">
                            {job.companyName}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {job.isFeatured && (
                          <Badge
                            variant="default"
                            className="text-[10px] uppercase font-bold tracking-wider shrink-0"
                          >
                            Featured
                          </Badge>
                        )}
                        <SignedIn>
                          <button
                            type="button"
                            disabled={isSavingThis}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSave(job._id);
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                              isSaved
                                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                            title={
                              isSaved
                                ? "Remove from saved jobs"
                                : "Save this job"
                            }
                            aria-label={
                              isSaved
                                ? "Remove from saved jobs"
                                : "Save this job"
                            }
                          >
                            <Bookmark
                              className={`w-4 h-4 transition-transform ${
                                isSaved
                                  ? "fill-primary text-primary animate-bookmark-pop"
                                  : "hover:scale-110"
                              }`}
                            />
                          </button>
                        </SignedIn>
                        <SignedOut>
                          <SignInButton mode="modal">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                              title="Sign in to save this job"
                              aria-label="Sign in to save this job"
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>
                          </SignInButton>
                        </SignedOut>
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
                        {job.location}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="font-medium text-[11px] capitalize gap-1"
                      >
                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                        {empType}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-medium text-[11px] capitalize gap-1"
                      >
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        {workMode}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-medium text-[11px] capitalize text-primary border-primary/30 gap-1"
                      >
                        <Target className="w-3 h-3 text-primary" />
                        {expLevel}
                      </Badge>
                      {job.salaryMin && job.salaryMax && (
                        <Badge
                          variant="secondary"
                          className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 gap-1"
                        >
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          {job.salaryMin.toLocaleString()} - $
                          {job.salaryMax.toLocaleString()}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>
                  </CardContent>

                  <CardFooter>
                    <Button
                      onClick={() => handleOpenApply(job._id)}
                      className="w-full font-bold text-xs"
                    >
                      View Details & Apply
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}

            {hasMore && (
              <div
                ref={loadMoreRef}
                className="col-span-full py-8 flex flex-col items-center justify-center gap-2"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading more opportunities...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog
        open={!!selectedJobId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJobId(null);
            setSelectedResumeId(null);
            setUseCustomUrl(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {!selectedJob ? (
            <DialogSkeleton rows={5} />
          ) : (
            <>
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

          {submitSuccess ? (
            <div className="py-8 text-center flex flex-col items-center gap-4 animate-in fade-in-50 zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-md animate-in zoom-in-50 duration-300">
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </div>
              <h3 className="text-xl font-bold">Application Submitted!</h3>
              <p className="text-muted-foreground text-xs max-w-md">
                Your application for{" "}
                <span className="font-semibold text-foreground">
                  {selectedJob?.title}
                </span>{" "}
                has been received by {selectedJob?.companyName}.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Job Description
                </h4>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line bg-muted/40 p-4 rounded-xl border border-border max-h-40 overflow-y-auto">
                  {selectedJob?.description}
                </p>
              </div>

              {appStatus?.isAuthor ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold text-center">
                  🔒 You are the author of this job posting. Self-applications
                  are disabled.
                </div>
              ) : appStatus?.hasApplied ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center">
                  ✓ You have already submitted an application for this position.
                </div>
              ) : (
                /* Candidate Apply Form */
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
                    className="space-y-4 border-t border-border pt-4"
                  >
                    <h4 className="text-sm font-bold">Quick Apply Form</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={applyForm.control}
                        name="applicantName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Full Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                autoComplete="off"
                                {...field}
                              />
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
                            <FormLabel className="text-xs">
                              Email Address *
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="john@example.com"
                                autoComplete="off"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Resume Selector Section */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" />{" "}
                          Attached Resume / CV *
                        </label>
                        {candidateResumes && candidateResumes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextState = !useCustomUrl;
                              setUseCustomUrl(nextState);
                              if (nextState) {
                                applyForm.setValue("resumeStorageId", "");
                                applyForm.setValue("resumeFileName", "");
                              } else {
                                const def =
                                  candidateResumes.find((r) => r.isDefault) ||
                                  candidateResumes[0];
                                setSelectedResumeId(def._id);
                                applyForm.setValue(
                                  "resumeStorageId",
                                  def.storageId,
                                );
                                applyForm.setValue(
                                  "resumeFileName",
                                  def.fileName,
                                );
                              }
                            }}
                            className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                          >
                            {useCustomUrl
                              ? "← Use Stored Resume"
                              : "Use External Link Instead"}
                          </button>
                        )}
                      </div>

                      {!useCustomUrl && candidateResumes === undefined ? (
                        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-3 animate-pulse">
                          <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3.5 bg-muted rounded w-40" />
                            <div className="h-2.5 bg-muted rounded w-20" />
                          </div>
                        </div>
                      ) : !useCustomUrl &&
                        candidateResumes &&
                        candidateResumes.length > 0 ? (
                        <div className="space-y-2">
                          {(() => {
                            const currentResume =
                              candidateResumes.find(
                                (r) => r._id === selectedResumeId,
                              ) ||
                              candidateResumes.find((r) => r.isDefault) ||
                              candidateResumes[0];

                            return (
                              <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold truncate max-w-50 sm:max-w-70">
                                        {currentResume?.fileName}
                                      </span>
                                      {currentResume?.isDefault && (
                                        <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground font-semibold">
                                          <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />{" "}
                                          Default
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground block">
                                      {formatFileSize(
                                        currentResume?.fileSize ?? 0,
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {candidateResumes.length > 1 && (
                                  <select
                                    value={
                                      selectedResumeId ?? currentResume?._id
                                    }
                                    onChange={(e) =>
                                      handleSelectResume(e.target.value)
                                    }
                                    className="text-xs font-medium bg-card border border-border rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                                  >
                                    {candidateResumes.map((r) => (
                                      <option key={r._id} value={r._id}>
                                        {r.fileName}{" "}
                                        {r.isDefault ? "(Default)" : ""}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : !useCustomUrl &&
                        candidateResumes &&
                        candidateResumes.length === 0 ? (
                        <div className="border border-dashed border-border rounded-xl p-4 text-center bg-muted/20 flex flex-col items-center gap-2">
                          <input
                            ref={inlineFileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleInlineResumeUpload}
                            disabled={isUploadingInline}
                            className="hidden"
                          />
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            {isUploadingInline ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold">
                              {isUploadingInline
                                ? "Uploading resume..."
                                : "Upload your resume"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              PDF, DOC, DOCX up to 5 MB
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                inlineFileInputRef.current?.click()
                              }
                              disabled={isUploadingInline}
                              className="text-xs h-7 px-2.5 font-semibold cursor-pointer"
                            >
                              Select File
                            </Button>
                            <span className="text-[11px] text-muted-foreground">
                              or
                            </span>
                            <button
                              type="button"
                              onClick={() => setUseCustomUrl(true)}
                              className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                            >
                              Provide Portfolio Link
                            </button>
                          </div>
                        </div>
                      ) : (
                        <FormField
                          control={applyForm.control}
                          name="resumeUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="https://linkedin.com/in/username or https://github.com"
                                  autoComplete="off"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {applyForm.formState.errors.resumeStorageId && (
                        <p className="text-xs font-semibold text-destructive mt-1.5 flex items-center gap-1.5 bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                          <X className="w-3.5 h-3.5 shrink-0" />
                          {applyForm.formState.errors.resumeStorageId.message}
                        </p>
                      )}
                    </div>

                    <FormField
                      control={applyForm.control}
                      name="coverLetter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">
                            Cover Letter / Note to Hiring Team *
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Briefly explain why you're a great fit for this position..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedJobId(null);
                          setSelectedResumeId(null);
                          setUseCustomUrl(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={applyForm.formState.isSubmitting}
                        className="gap-2 shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                      >
                        {applyForm.formState.isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Job Application"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
