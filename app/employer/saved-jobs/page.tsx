"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bookmark,
  Trash2,
  ExternalLink,
  Search,
  Sparkles,
  Briefcase,
  MapPin,
  DollarSign,
  TrendingUp,
  ArrowRight,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

interface SavedJobItem {
  _id: Id<"savedJobs">;
  _creationTime: number;
  jobId: Id<"jobs">;
  savedAt: number;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  employmentType: string;
  workMode: string;
  experienceLevel: string;
  type: string;
  category: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  requirements?: string[];
  isFeatured?: boolean;
  jobStatus: string;
}

export default function EmployerSavedJobsPage() {
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<SavedJobItem | null>(null);

  // Filter saved jobs based on search term
  const filteredJobs = useMemo(() => {
    if (!savedJobs) return [];
    if (!searchQuery.trim()) return savedJobs;

    const query = searchQuery.toLowerCase();
    return savedJobs.filter(
      (j) =>
        j.jobTitle.toLowerCase().includes(query) ||
        j.companyName.toLowerCase().includes(query) ||
        j.location.toLowerCase().includes(query) ||
        j.workMode.toLowerCase().includes(query) ||
        j.category.toLowerCase().includes(query)
    );
  }, [savedJobs, searchQuery]);

  const handleRemoveSaved = async (jobId: Id<"jobs">, title: string) => {
    try {
      await toggleSave({ jobId });
      toast.info(`"${title}" removed from saved jobs`);
      if (selectedJob?.jobId === jobId) {
        setSelectedJob(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove saved job"
      );
    }
  };

  const activeCount = useMemo(() => {
    if (!savedJobs) return 0;
    return savedJobs.filter((j) => j.jobStatus === "active").length;
  }, [savedJobs]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-6xl w-full mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Bookmark className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              Saved Jobs & Benchmarks
              {savedJobs && savedJobs.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                >
                  {savedJobs.length} {savedJobs.length === 1 ? "Job" : "Jobs"}
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
            Bookmarked positions for competitor benchmarking, salary reference,
            and hiring template inspiration.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5 cursor-pointer"
            >
              Explore Public Jobs <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href="/employer/post-job">
            <Button size="sm" className="text-xs font-bold gap-1.5 cursor-pointer">
              <PlusCircle className="w-3.5 h-3.5" /> Post a Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {savedJobs && savedJobs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-card/70 border-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Bookmarks</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">
                {savedJobs.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Bookmark className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/70 border-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Listings</p>
              <h3 className="text-2xl font-black text-emerald-500 mt-0.5">
                {activeCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/70 border-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Competitor Insights</p>
              <h3 className="text-sm font-bold text-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Real-time tracking
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
          </Card>
        </div>
      )}

      {/* Filter / Search Bar */}
      {savedJobs && savedJobs.length > 0 && (
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter by title, company, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card border-border rounded-xl"
          />
        </div>
      )}

      {/* Content Area */}
      {savedJobs === undefined ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-5 flex flex-col gap-4 animate-pulse bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded-md w-3/4" />
                  <div className="h-3 bg-muted rounded-md w-1/2" />
                </div>
              </div>
              <div className="h-16 bg-muted rounded-md w-full mt-2" />
            </Card>
          ))}
        </div>
      ) : savedJobs.length === 0 ? (
        /* Empty State */
        <Card className="p-10 sm:p-14 text-center flex flex-col items-center gap-4 bg-card border-border shadow-md my-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-3xl">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-foreground">
            No saved jobs yet
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md leading-relaxed">
            As an employer, you can bookmark industry listings while browsing the
            public job directory to analyze market salaries, required skillsets, or
            borrow job post inspiration.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
            <Link href="/">
              <Button className="font-bold text-xs gap-2 cursor-pointer">
                <Search className="w-3.5 h-3.5" /> Browse Public Jobs
              </Button>
            </Link>
            <Link href="/employer/post-job">
              <Button variant="outline" className="font-semibold text-xs gap-1.5 cursor-pointer">
                <PlusCircle className="w-3.5 h-3.5" /> Create a Job Posting
              </Button>
            </Link>
          </div>
        </Card>
      ) : filteredJobs.length === 0 ? (
        /* No Search Results */
        <Card className="p-8 text-center bg-card border-border">
          <p className="text-sm font-semibold text-muted-foreground">
            No saved jobs match &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="text-xs text-primary mt-2 font-bold cursor-pointer"
          >
            Clear Filter
          </Button>
        </Card>
      ) : (
        /* Saved Jobs Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((item) => {
            const isClosed = item.jobStatus === "closed";
            return (
              <Card
                key={item._id}
                className={`flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs hover:shadow-md bg-card ${
                  item.isFeatured ? "border-primary/30 ring-1 ring-primary/20" : ""
                }`}
              >
                <CardHeader className="pb-3 space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-xs shrink-0">
                        {item.companyName?.[0] || "🏢"}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-bold truncate">
                          {item.jobTitle}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                          {item.companyName}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isClosed ? (
                        <Badge
                          variant="destructive"
                          className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0"
                        >
                          Closed
                        </Badge>
                      ) : item.isFeatured ? (
                        <Badge
                          variant="default"
                          className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0"
                        >
                          Featured
                        </Badge>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(item.jobId, item.jobTitle)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Remove bookmark"
                        aria-label="Remove bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      <MapPin className="w-3 h-3 mr-1 inline opacity-70" />
                      {item.location}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-medium capitalize">
                      {item.employmentType || item.type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-medium capitalize text-primary border-primary/20">
                      {item.workMode}
                    </Badge>
                    {item.salaryMin && item.salaryMax && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                      >
                        <DollarSign className="w-2.5 h-2.5 inline" />
                        {item.salaryMin.toLocaleString()} - {item.salaryMax.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-primary" />
                    <span>
                      Saved {new Date(item.savedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/60 flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedJob(item)}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-semibold h-8 cursor-pointer"
                  >
                    View Details
                  </Button>
                  <Link
                    href={`/employer/post-job?templateTitle=${encodeURIComponent(item.jobTitle)}&templateCategory=${encodeURIComponent(item.category || "")}&templateType=${encodeURIComponent(item.employmentType || "")}`}
                    className="flex-1"
                  >
                    <Button
                      size="sm"
                      className="w-full text-xs font-bold h-8 cursor-pointer gap-1"
                    >
                      Post Similar <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Job Details Modal Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 pb-1">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-xs shrink-0">
                {selectedJob?.companyName?.[0] || "🏢"}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {selectedJob?.jobTitle}
                  {selectedJob?.isFeatured && (
                    <Badge variant="default" className="text-[10px]">
                      Featured
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span>{selectedJob?.companyName}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    {selectedJob?.location}
                  </span>
                  <span>•</span>
                  <span>{selectedJob?.workMode}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Type</span>
                <span className="font-semibold capitalize text-foreground">
                  {selectedJob?.employmentType || selectedJob?.type || "Full-time"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Experience</span>
                <span className="font-semibold capitalize text-foreground">
                  {selectedJob?.experienceLevel || "Mid"} Level
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Status</span>
                <span className={`font-semibold capitalize ${selectedJob?.jobStatus === "active" ? "text-emerald-500" : "text-rose-500"}`}>
                  {selectedJob?.jobStatus || "Active"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Salary</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectedJob?.salaryMin && selectedJob?.salaryMax
                    ? `$${selectedJob.salaryMin.toLocaleString()} - $${selectedJob.salaryMax.toLocaleString()}`
                    : "Not specified"}
                </span>
              </div>
            </div>

            {/* Job Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Role Description
              </h4>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">
                {selectedJob?.description}
              </p>
            </div>

            {/* Requirements if any */}
            {selectedJob?.requirements && selectedJob.requirements.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Key Requirements
                </h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                  {selectedJob.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
            {selectedJob && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveSaved(selectedJob.jobId, selectedJob.jobTitle)}
                className="text-xs text-destructive hover:bg-destructive/10 font-semibold cursor-pointer gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Bookmark
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedJob(null)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>
              {selectedJob && (
                <Link
                  href={`/employer/post-job?templateTitle=${encodeURIComponent(selectedJob.jobTitle)}&templateCategory=${encodeURIComponent(selectedJob.category || "")}&templateType=${encodeURIComponent(selectedJob.employmentType || "")}`}
                >
                  <Button size="sm" className="text-xs font-bold gap-1.5 cursor-pointer">
                    <PlusCircle className="w-3.5 h-3.5" /> Use as Job Template
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
