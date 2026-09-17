"use client";

import { useState, useMemo } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { getOrgPlanQuota } from "@/lib/orgHelpers";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Pencil,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Briefcase,
  UserCheck,
  Sparkles,
  Bookmark,
  MapPin,
} from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeleton-card";
import EmptyState from "@/components/EmptyState";

interface JobItem {
  _id: Id<"jobs">;
  title: string;
  location: string;
  employmentType?: "full-time" | "part-time" | "contract" | "internship";
  workMode?: "remote" | "hybrid" | "onsite";
  experienceLevel?: "entry" | "junior" | "mid" | "senior" | "lead";
  type?: string;
  category: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  requirements?: string[];
  status: "active" | "draft" | "closed";
  isFeatured?: boolean;
}

export default function EmployerDashboardPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const plan = (organization?.publicMetadata?.plan as string) || "free";
  const quota = getOrgPlanQuota(plan);

  const jobs = useQuery(api.jobs.listOrgJobs, orgId ? { orgId } : "skip");
  const applications = useQuery(
    api.applications.getOrgApplications,
    orgId ? { orgId } : "skip"
  );

  const updateStatus = useMutation(api.jobs.updateJobStatus).withOptimisticUpdate(
    (localStore, { id, status }) => {
      if (orgId) {
        const current = localStore.getQuery(api.jobs.listOrgJobs, { orgId });
        if (current) {
          localStore.setQuery(
            api.jobs.listOrgJobs,
            { orgId },
            current.map((job) =>
              job._id === id ? { ...job, status } : job,
            ),
          );
        }
      }
    },
  );
  const updateJob = useMutation(api.jobs.updateJob);
  const deleteJob = useMutation(api.jobs.deleteJob).withOptimisticUpdate(
    (localStore, { id }) => {
      if (orgId) {
        const current = localStore.getQuery(api.jobs.listOrgJobs, { orgId });
        if (current) {
          localStore.setQuery(
            api.jobs.listOrgJobs,
            { orgId },
            current.filter((job) => job._id !== id),
          );
        }
      }
    },
  );

  // Modal states
  const [jobToDelete, setJobToDelete] = useState<JobItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [jobToEdit, setJobToEdit] = useState<JobItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    location: "",
    employmentType: "full-time" as "full-time" | "part-time" | "contract" | "internship",
    workMode: "remote" as "remote" | "hybrid" | "onsite",
    experienceLevel: "mid" as "entry" | "junior" | "mid" | "senior" | "lead",
    category: "Engineering",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    description: "",
    requirements: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Compute applicants per job
  const applicantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (applications) {
      for (const app of applications) {
        counts[app.jobId] = (counts[app.jobId] || 0) + 1;
      }
    }
    return counts;
  }, [applications]);

  // KPI Analytics calculations
  const totalJobsCount = jobs?.length ?? 0;
  const activeJobsCount = jobs?.filter((j) => j.status === "active").length ?? 0;
  const closedJobsCount = jobs?.filter((j) => j.status === "closed").length ?? 0;
  const totalApplicationsCount = applications?.length ?? 0;

  const submittedCount = useMemo(
    () => applications?.filter((a) => a.status === "submitted").length ?? 0,
    [applications]
  );
  const interviewingCount = useMemo(
    () => applications?.filter((a) => a.status === "interviewing").length ?? 0,
    [applications]
  );
  const hiredCount = useMemo(
    () => applications?.filter((a) => a.status === "hired").length ?? 0,
    [applications]
  );

  const handleToggleStatus = async (
    id: Id<"jobs">,
    currentStatus: "active" | "draft" | "closed"
  ) => {
    const nextStatus = currentStatus === "active" ? "closed" : "active";
    try {
      await updateStatus({ id, status: nextStatus });
      toast.success(`Job listing marked as ${nextStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      await deleteJob({ id: jobToDelete._id });
      toast.success("Job listing deleted successfully");
      setJobToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (job: JobItem) => {
    setJobToEdit(job);
    setEditForm({
      title: job.title || "",
      location: job.location || "",
      employmentType: job.employmentType || "full-time",
      workMode: job.workMode || "remote",
      experienceLevel: job.experienceLevel || "mid",
      category: job.category || "Engineering",
      salaryMin: job.salaryMin !== undefined ? String(job.salaryMin) : "",
      salaryMax: job.salaryMax !== undefined ? String(job.salaryMax) : "",
      salaryCurrency: job.salaryCurrency || "USD",
      description: job.description || "",
      requirements: job.requirements?.join(", ") || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobToEdit) return;

    if (!editForm.title?.trim() || editForm.title.trim().length < 3) {
      toast.error("Job title must be at least 3 characters");
      return;
    }
    if (!editForm.location?.trim() || editForm.location.trim().length < 2) {
      toast.error("Location is required");
      return;
    }
    if (!editForm.category?.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!editForm.description?.trim() || editForm.description.trim().length < 20) {
      toast.error("Job description must be at least 20 characters");
      return;
    }
    if (
      editForm.salaryMin &&
      editForm.salaryMax &&
      Number(editForm.salaryMax) < Number(editForm.salaryMin)
    ) {
      toast.error("Maximum salary cannot be lower than minimum salary");
      return;
    }

    const parsedRequirements = editForm.requirements
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    setIsSavingEdit(true);
    try {
      await updateJob({
        id: jobToEdit._id,
        title: editForm.title,
        location: editForm.location,
        employmentType: editForm.employmentType,
        workMode: editForm.workMode,
        experienceLevel: editForm.experienceLevel,
        category: editForm.category,
        salaryMin: editForm.salaryMin ? Number(editForm.salaryMin) : undefined,
        salaryMax: editForm.salaryMax ? Number(editForm.salaryMax) : undefined,
        salaryCurrency: editForm.salaryCurrency,
        description: editForm.description,
        requirements: parsedRequirements.length > 0 ? parsedRequirements : undefined,
      });
      toast.success("Job details updated successfully");
      setJobToEdit(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Employer Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Managing hiring for{" "}
            <span className="text-primary font-semibold">{organization?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/employer/saved-jobs">
            <Button variant="outline" size="sm" className="font-semibold gap-1.5 cursor-pointer">
              <Bookmark className="w-3.5 h-3.5 text-primary" /> Saved Jobs
            </Button>
          </Link>
          <Link href="/employer/post-job">
            <Button size="sm" className="font-bold gap-1.5 cursor-pointer">
              <span>+</span> Post a New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* 4-Pillar SaaS KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Jobs Portfolio (Active vs Closed) */}
        <Card className="border-border shadow-xs hover:border-border/80 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Jobs Portfolio
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{totalJobsCount}</span>
              <span className="text-xs text-muted-foreground font-medium">total jobs</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                {activeJobsCount} Active
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border font-medium">
                {closedJobsCount} Closed
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Applicants Received */}
        <Card className="border-border shadow-xs hover:border-border/80 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Applicants
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold">{totalApplicationsCount}</span>
              <Link href="/employer/applications">
                <Button variant="ghost" size="sm" className="text-xs h-7 text-primary hover:text-primary/80 gap-1 font-semibold px-2 cursor-pointer">
                  Board <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {submittedCount} new / unreviewed
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pipeline Health (Active Interviews & Hires) */}
        <Card className="border-border shadow-xs hover:border-border/80 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Interviews & Hires
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{interviewingCount}</span>
              <span className="text-xs text-muted-foreground font-medium">interviewing</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-medium">
                {hiredCount} Hired 🎉
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Plan & Quota Capacity */}
        <Card className="border-border shadow-xs hover:border-border/80 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Plan Capacity
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold capitalize">{quota.name} Tier</span>
              <Link href="/employer/billing">
                <Button variant="outline" size="sm" className="text-xs h-7 px-2 cursor-pointer font-semibold">
                  Manage
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {activeJobsCount} / {quota.maxJobs === Infinity ? "∞" : quota.maxJobs} active slots used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table Section */}
      <Card className="border-border shadow-xl">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Your Company Job Postings</CardTitle>
            <CardDescription className="text-xs">
              {jobs?.length ?? 0} total listings managed by your team
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {jobs === undefined ? (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Job Title</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Applicants</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4].map((n) => (
                    <TableRowSkeleton key={n} cols={6} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No job listings posted yet"
              description="Your organization hasn't published any job openings yet. Start building your candidate pipeline by posting your first job."
              actionLabel="+ Post Your First Job"
              actionHref="/employer/post-job"
            />
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Job Title</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Applicants</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const count = applicantCounts[job._id] ?? 0;
                    return (
                      <TableRow key={job._id}>
                        <TableCell className="font-bold">
                          {job.title}
                          {job.isFeatured && (
                            <Badge variant="default" className="ml-2 text-[10px]">
                              Featured
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            {job.location}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            {job.employmentType ?? job.type ?? "Full-time"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/employer/applications?jobId=${job._id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs font-semibold gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>{count}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {count === 1 ? "applicant" : "applicants"}
                              </span>
                            </Button>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={job.status === "active" ? "default" : "secondary"}
                            className="capitalize text-[10px]"
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(job as JobItem)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                              title="Edit listing details"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(job._id, job.status)}
                              className="h-7 px-2 text-xs cursor-pointer font-medium"
                            >
                              {job.status === "active" ? "Pause" : "Activate"}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setJobToDelete(job as JobItem)}
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                              title="Delete listing"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Styled Delete Confirmation Dialog */}
      <Dialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Delete Job Listing
            </DialogTitle>
            <DialogDescription className="text-sm pt-1">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{jobToDelete?.title}</strong>? All
              active applications associated with this posting will also be removed. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setJobToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-bold"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Styled Edit Job Dialog */}
      <Dialog open={!!jobToEdit} onOpenChange={(open) => !open && setJobToEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Edit Job Listing
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update position details, compensation, and requirements.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="title" className="text-xs font-semibold">
                  Job Title *
                </Label>
                <Input
                  id="title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  placeholder="e.g. Senior Frontend Engineer"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="location" className="text-xs font-semibold">
                  Location *
                </Label>
                <Input
                  id="location"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="category" className="text-xs font-semibold">
                  Category *
                </Label>
                <Input
                  id="category"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  placeholder="e.g. Engineering, Product, Design"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employment Type</Label>
                <Select
                  value={editForm.employmentType}
                  onValueChange={(val) => {
                    if (val) setEditForm({ ...editForm, employmentType: val });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="part-time">Part-Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Work Mode</Label>
                <Select
                  value={editForm.workMode}
                  onValueChange={(val) => {
                    if (val) setEditForm({ ...editForm, workMode: val });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Experience Level</Label>
                <Select
                  value={editForm.experienceLevel}
                  onValueChange={(val) => {
                    if (val) setEditForm({ ...editForm, experienceLevel: val });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead / Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="salaryMin" className="text-xs font-semibold">
                    Min Salary ($)
                  </Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    value={editForm.salaryMin}
                    onChange={(e) =>
                      setEditForm({ ...editForm, salaryMin: e.target.value })
                    }
                    placeholder="80000"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="salaryMax" className="text-xs font-semibold">
                    Max Salary ($)
                  </Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    value={editForm.salaryMax}
                    onChange={(e) =>
                      setEditForm({ ...editForm, salaryMax: e.target.value })
                    }
                    placeholder="120000"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Job Description *
                </Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Overview of the role, responsibilities, and qualifications..."
                  className="text-sm leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="requirements" className="text-xs font-semibold">
                  Required Skills & Keywords (comma-separated)
                </Label>
                <Input
                  id="requirements"
                  value={editForm.requirements}
                  onChange={(e) =>
                    setEditForm({ ...editForm, requirements: e.target.value })
                  }
                  placeholder="e.g. React, TypeScript, Next.js, Tailwind CSS"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Separate skills with commas. Candidates will see these tagged on the job posting.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setJobToEdit(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSavingEdit ||
                  !editForm.title?.trim() ||
                  editForm.title.trim().length < 3 ||
                  !editForm.location?.trim() ||
                  editForm.location.trim().length < 2 ||
                  !editForm.description?.trim() ||
                  editForm.description.trim().length < 20
                }
                className="font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
