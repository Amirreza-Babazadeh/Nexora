"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogSkeleton,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  ExternalLink,
  Search,
  Clock,
  Sparkles,
  Users,
  UserCheck,
  XCircle,
  Eye,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { TableRowSkeleton, Skeleton } from "@/components/ui/skeleton-card";
import EmptyState from "@/components/EmptyState";

type ApplicationStage =
  | "all"
  | "submitted"
  | "under_review"
  | "interviewing"
  | "hired"
  | "rejected";

interface OrgApplicationItem {
  _id: Id<"applications">;
  _creationTime: number;
  jobId: Id<"jobs">;
  applicantUserId?: string;
  applicantName: string;
  applicantEmail: string;
  resumeStorageId?: Id<"_storage">;
  resumeFileName?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string;
  status: string;
  appliedAt: number;
  jobTitle: string;
  companyName: string;
}

function EmployerApplicationsContent() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams.get("jobId");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  const applications = useQuery(
    api.applications.getOrgApplications,
    orgId ? { orgId } : "skip",
  );

  const orgJobs = useQuery(api.jobs.listOrgJobs, orgId ? { orgId } : "skip");

  const updateStatus = useMutation(
    api.applications.updateApplicationStatus,
  ).withOptimisticUpdate((localStore, { id, status }) => {
    if (orgId) {
      const current = localStore.getQuery(api.applications.getOrgApplications, {
        orgId,
      });
      if (current) {
        localStore.setQuery(
          api.applications.getOrgApplications,
          { orgId },
          current.map((app) => (app._id === id ? { ...app, status } : app)),
        );
      }
    }
  });

  const [selectedStage, setSelectedStage] = useState<ApplicationStage>("all");
  const [selectedJobId, setSelectedJobId] = useState<string>(() => urlJobId || "all");
  const [prevUrlJobId, setPrevUrlJobId] = useState(urlJobId);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeApplicant, setActiveApplicant] =
    useState<OrgApplicationItem | null>(null);

  if (urlJobId !== prevUrlJobId) {
    setPrevUrlJobId(urlJobId);
    if (urlJobId) {
      setSelectedJobId(urlJobId);
    }
  }

  const handleStatusChange = async (
    id: Id<"applications">,
    newStatus:
      "submitted" | "under_review" | "interviewing" | "rejected" | "hired",
  ) => {
    try {
      await updateStatus({ id, status: newStatus });
      const stageLabels: Record<string, string> = {
        submitted: "Submitted",
        under_review: "Under Review",
        interviewing: "Interviewing",
        rejected: "Rejected",
        hired: "Hired 🎉",
      };
      toast.success(`Application updated to ${stageLabels[newStatus]}`);
      if (activeApplicant && activeApplicant._id === id) {
        setActiveApplicant((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update application status",
      );
    }
  };

  // Title of the currently selected job for the filter dropdown
  const selectedJobTitle = useMemo(() => {
    if (!selectedJobId || selectedJobId === "all") {
      return `All Jobs (${orgJobs?.length ?? 0})`;
    }
    const found = orgJobs?.find((j) => j._id === selectedJobId);
    return found ? found.title : `All Jobs (${orgJobs?.length ?? 0})`;
  }, [selectedJobId, orgJobs]);

  // Compute stage statistics
  const stageCounts = useMemo(() => {
    const counts = {
      all: applications?.length ?? 0,
      submitted: 0,
      under_review: 0,
      interviewing: 0,
      hired: 0,
      rejected: 0,
    };
    if (applications) {
      for (const app of applications) {
        if (app.status in counts) {
          counts[app.status as keyof typeof counts]++;
        }
      }
    }
    return counts;
  }, [applications]);

  // Filter applications by stage, job, and candidate keyword search
  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    return applications.filter((app) => {
      const matchesStage =
        selectedStage === "all" || app.status === selectedStage;
      const matchesJob = selectedJobId === "all" || app.jobId === selectedJobId;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.applicantName.toLowerCase().includes(q) ||
        app.applicantEmail.toLowerCase().includes(q) ||
        app.jobTitle.toLowerCase().includes(q);
      return matchesStage && matchesJob && matchesSearch;
    });
  }, [applications, selectedStage, selectedJobId, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <Badge
            variant="secondary"
            className="text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
          >
            <Clock className="w-3 h-3 mr-1" /> Submitted
          </Badge>
        );
      case "under_review":
        return (
          <Badge
            variant="secondary"
            className="text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          >
            <Eye className="w-3 h-3 mr-1" /> Under Review
          </Badge>
        );
      case "interviewing":
        return (
          <Badge
            variant="secondary"
            className="text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
          >
            <Sparkles className="w-3 h-3 mr-1" /> Interviewing
          </Badge>
        );
      case "hired":
        return (
          <Badge
            variant="secondary"
            className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          >
            <UserCheck className="w-3 h-3 mr-1" /> Hired
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="secondary"
            className="text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          >
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stages: { id: ApplicationStage; label: string; count: number }[] = [
    { id: "all", label: "All Candidates", count: stageCounts.all },
    { id: "submitted", label: "Submitted", count: stageCounts.submitted },
    {
      id: "under_review",
      label: "Under Review",
      count: stageCounts.under_review,
    },
    {
      id: "interviewing",
      label: "Interviewing",
      count: stageCounts.interviewing,
    },
    { id: "hired", label: "Hired", count: stageCounts.hired },
    { id: "rejected", label: "Rejected", count: stageCounts.rejected },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
          <Users className="w-3.5 h-3.5" /> Hiring & Pipeline
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Applicant Review Board
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Review candidates, inspect verified resumes, and update hiring stages
          for{" "}
          <strong className="text-foreground font-semibold">
            {organization?.name || "your organization"}
          </strong>
        </p>
      </div>

      {/* Pipeline Stage Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/70 scrollbar-none">
        {stages.map((stage) => {
          const isActive = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{stage.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background/80 text-muted-foreground border border-border"
                }`}
              >
                {stage.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search candidate or job..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {orgJobs && orgJobs.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              Filter by Job:
            </span>
            <Select
              value={selectedJobId}
              onValueChange={(val) => setSelectedJobId(val || "all")}
            >
              <SelectTrigger className="text-xs font-semibold bg-card border border-border rounded-xl px-3 h-9 cursor-pointer w-full sm:w-60 truncate">
                <span data-slot="select-value" className="flex flex-1 text-left truncate">
                  {selectedJobTitle}
                </span>
              </SelectTrigger>
              <SelectContent className="text-xs font-semibold">
                <SelectItem value="all">All Jobs ({orgJobs.length})</SelectItem>
                {orgJobs.map((j) => (
                  <SelectItem key={j._id} value={j._id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Board Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              {selectedStage === "all"
                ? "All Candidates"
                : `${stages.find((s) => s.id === selectedStage)?.label} Candidates`}
            </CardTitle>
            <CardDescription className="text-xs">
              Showing {filteredApplications.length} of{" "}
              {applications?.length ?? 0} applications
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {applications === undefined ? (
            <div className="rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Candidate</TableHead>
                    <TableHead className="font-bold">Target Position</TableHead>
                    <TableHead className="font-bold">Stage</TableHead>
                    <TableHead className="font-bold">Resume</TableHead>
                    <TableHead className="font-bold">Applied Date</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TableRowSkeleton key={n} cols={6} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : applications.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No applications received yet"
              description="When job seekers apply to your job listings, their resumes and application details will appear here in real-time."
              actionLabel="View Active Postings"
              actionHref="/employer/dashboard"
            />
          ) : filteredApplications.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                No matching candidates found
              </p>
              <p className="text-xs text-muted-foreground">
                Try clearing your search or switching to another stage tab.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStage("all");
                  setSelectedJobId("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs font-semibold"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-xs">
                      Candidate
                    </TableHead>
                    <TableHead className="font-bold text-xs">
                      Role Applied For
                    </TableHead>
                    <TableHead className="font-bold text-xs">
                      Applied Date
                    </TableHead>
                    <TableHead className="font-bold text-xs">
                      Attached Resume
                    </TableHead>
                    <TableHead className="font-bold text-xs">
                      Pipeline Stage
                    </TableHead>
                    <TableHead className="font-bold text-xs text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow
                      key={app._id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {/* Candidate Name & Email */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {app.applicantName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            {app.applicantUserId ? (
                              <Link
                                href={`/candidate/${app.applicantUserId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 truncate group cursor-pointer"
                                title="View candidate public portfolio"
                              >
                                <span className="truncate">{app.applicantName}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0" />
                              </Link>
                            ) : (
                              <span className="font-bold text-sm text-foreground block truncate">
                                {app.applicantName}
                              </span>
                            )}
                            <span className="text-muted-foreground text-xs block truncate">
                              {app.applicantEmail}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Job Title */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-foreground block">
                            {app.jobTitle}
                          </span>
                        </div>
                      </TableCell>

                      {/* Applied Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(app.appliedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>

                      {/* Resume Link / Stored File */}
                      <TableCell>
                        {app.resumeUrl ? (
                          <a
                            href={app.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 text-primary font-semibold text-xs transition-colors cursor-pointer"
                            title="Open candidate resume"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-32.5">
                              {app.resumeFileName || "View Resume"}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            No resume attached
                          </span>
                        )}
                      </TableCell>

                      {/* Stage Dropdown */}
                      <TableCell>
                        <Select
                          value={app.status}
                          onValueChange={(val) =>
                            handleStatusChange(
                              app._id,
                              val as
                                | "submitted"
                                | "under_review"
                                | "interviewing"
                                | "rejected"
                                | "hired",
                            )
                          }
                        >
                          <SelectTrigger className="w-36.25 h-8 text-xs font-semibold cursor-pointer">
                            <SelectValue>
                              {getStatusBadge(app.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">
                              <span className="flex items-center gap-1.5 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />{" "}
                                Submitted
                              </span>
                            </SelectItem>
                            <SelectItem value="under_review">
                              <span className="flex items-center gap-1.5 text-xs font-semibold">
                                <Eye className="w-3.5 h-3.5 text-amber-500" />{" "}
                                Under Review
                              </span>
                            </SelectItem>
                            <SelectItem value="interviewing">
                              <span className="flex items-center gap-1.5 text-xs font-semibold">
                                <Sparkles className="w-3.5 h-3.5 text-purple-500" />{" "}
                                Interviewing
                              </span>
                            </SelectItem>
                            <SelectItem value="hired">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />{" "}
                                Hired 🎉
                              </span>
                            </SelectItem>
                            <SelectItem value="rejected">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />{" "}
                                Rejected
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Detail Drawer Trigger */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveApplicant(app)}
                          className="text-xs font-semibold cursor-pointer gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Detail Modal */}
      <Dialog
        open={!!activeApplicant}
        onOpenChange={(open) => !open && setActiveApplicant(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Candidate Application
              Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Application for{" "}
              <strong className="text-foreground">
                {activeApplicant?.jobTitle}
              </strong>
            </DialogDescription>
          </DialogHeader>

          {!activeApplicant ? (
            <DialogSkeleton rows={5} />
          ) : (
            <div className="space-y-4 pt-2 text-xs">
              {/* Status Header */}
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block text-[11px] mb-1">
                    Current Stage
                  </span>
                  <div>{getStatusBadge(activeApplicant.status)}</div>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px] mb-1">
                    Submission Date
                  </span>
                  <span className="font-semibold text-foreground">
                    {new Date(activeApplicant.appliedAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold block text-[11px]">
                    Applicant Contact
                  </span>
                  {activeApplicant.applicantUserId && (
                    <Link
                      href={`/candidate/${activeApplicant.applicantUserId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "h-6 px-2 text-[10px] font-semibold gap-1 shadow-xs cursor-pointer",
                      })}
                    >
                      <User className="w-3 h-3 text-primary" /> View Full Portfolio
                    </Link>
                  )}
                </div>
                <p className="font-bold text-sm text-foreground">
                  {activeApplicant.applicantName}
                </p>
                <a
                  href={`mailto:${activeApplicant.applicantEmail}`}
                  className="text-primary hover:underline font-medium block"
                >
                  {activeApplicant.applicantEmail}
                </a>
              </div>

              {/* Resume Attached */}
              <div className="space-y-1.5">
                <span className="text-muted-foreground font-semibold block text-[11px]">
                  Verified Resume Document
                </span>
                {activeApplicant.resumeUrl ? (
                  <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-foreground text-xs truncate">
                        {activeApplicant.resumeFileName ||
                          "Candidate_Resume.pdf"}
                      </span>
                    </div>
                    <a
                      href={activeApplicant.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shrink-0 cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3 h-3" /> Open PDF
                    </a>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">
                    No resume attached
                  </p>
                )}
              </div>

              {/* Cover Letter */}
              {activeApplicant.coverLetter && (
                <div className="space-y-1">
                  <span className="text-muted-foreground font-semibold block text-[11px]">
                    Cover Letter & Notes
                  </span>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border leading-relaxed text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {activeApplicant.coverLetter}
                  </div>
                </div>
              )}

              {/* Stage Transition Buttons */}
              <div className="space-y-2 border-t border-border pt-3">
                <span className="text-muted-foreground font-semibold block text-[11px]">
                  Quick Stage Action
                </span>
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={
                      activeApplicant.status === "under_review"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleStatusChange(activeApplicant._id, "under_review")
                    }
                    className="text-xs h-8 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Under Review
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeApplicant.status === "interviewing"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleStatusChange(activeApplicant._id, "interviewing")
                    }
                    className="text-xs h-8 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Interview
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeApplicant.status === "hired" ? "default" : "outline"
                    }
                    onClick={() =>
                      handleStatusChange(activeApplicant._id, "hired")
                    }
                    className="text-xs h-8 cursor-pointer text-emerald-600 dark:text-emerald-400"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Hire Candidate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleStatusChange(activeApplicant._id, "rejected")
                    }
                    className="text-xs h-8 cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmployerApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse p-4">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      }
    >
      <EmployerApplicationsContent />
    </Suspense>
  );
}
