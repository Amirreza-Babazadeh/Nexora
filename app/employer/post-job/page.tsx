"use client";

import { useOrganization, useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { postJobSchema, PostJobFormValues } from "@/lib/schemas";
import JobQuotaGate from "@/components/JobQuotaGate";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";

export default function PostJobPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { has } = useAuth();
  const orgId = organization?.id ?? "";

  const isPro = has?.({ plan: "pro" }) || has?.({ plan: "org:pro" });
  const isStarter = has?.({ plan: "starter" }) || has?.({ plan: "org:starter" });
  const plan = isPro ? "pro" : isStarter ? "starter" : (organization?.publicMetadata?.plan as string) || "free";

  const jobs = useQuery(api.jobs.listOrgJobs, orgId ? { orgId } : "skip");
  const activeJobCount = jobs?.filter((j) => j.status === "active").length ?? 0;

  const createJob = useMutation(api.jobs.createJob);

  const form = useForm<PostJobFormValues>({
    resolver: zodResolver(postJobSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      companyName: organization?.name ?? "",
      location: "",
      employmentType: "full-time",
      workMode: "remote",
      experienceLevel: "mid",
      category: "Engineering",
      description: "",
      isFeatured: false,
    },
  });

  const onSubmit = async (values: PostJobFormValues) => {
    if (!orgId) {
      toast.error("Organization ID is missing. Please select an organization.");
      return;
    }

    // Strict client-side pre-flight checks: NEVER send incomplete data to Convex backend
    if (!values.title?.trim() || values.title.trim().length < 3) {
      toast.error("Job title must be at least 3 characters.");
      return;
    }
    if (!values.companyName?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    if (!values.location?.trim()) {
      toast.error("Location is required.");
      return;
    }
    if (!values.description?.trim() || values.description.trim().length < 20) {
      toast.error("Job description must be at least 20 characters.");
      return;
    }
    if (
      values.salaryMin &&
      values.salaryMax &&
      Number(values.salaryMax) < Number(values.salaryMin)
    ) {
      toast.error("Maximum salary cannot be lower than minimum salary.");
      return;
    }

    try {
      await createJob({
        title: values.title.trim(),
        companyName: values.companyName.trim(),
        location: values.location.trim(),
        employmentType: values.employmentType,
        workMode: values.workMode,
        experienceLevel: values.experienceLevel,
        type: values.employmentType,
        category: values.category,
        salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
        salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
        salaryCurrency: "USD",
        description: values.description.trim(),
        orgId,
        isFeatured: Boolean(values.isFeatured),
        plan,
      });

      toast.success("Job listing published successfully!");
      router.push("/employer/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post job");
    }
  };

  return (
    <JobQuotaGate activeJobCount={activeJobCount}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Create a New Job Listing
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Post an open position for <span className="text-primary font-semibold">{organization?.name}</span> to reach job seekers on Nexora.
          </p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-bold">Job Specification</CardTitle>
            <CardDescription className="text-xs">
              Fill out the role details below. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  const firstError =
                    errors.title?.message ||
                    errors.companyName?.message ||
                    errors.location?.message ||
                    errors.description?.message ||
                    errors.salaryMax?.message ||
                    "Please fill in all required fields correctly before publishing.";
                  toast.error(firstError);
                })}
                className="space-y-6"
              >
                {/* Job Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">Job Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Senior Frontend Engineer"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Name" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Location *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. San Francisco, CA or Worldwide" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Employment Type */}
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Employment Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="internship">Internship</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Work Mode */}
                  <FormField
                    control={form.control}
                    name="workMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Work Mode *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select work mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="remote">Remote</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                            <SelectItem value="onsite">Onsite</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Experience Level */}
                  <FormField
                    control={form.control}
                    name="experienceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Experience Level *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="entry">Entry Level</SelectItem>
                            <SelectItem value="junior">Junior</SelectItem>
                            <SelectItem value="mid">Mid Level</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="lead">Lead / Principal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Min Salary */}
                  <FormField
                    control={form.control}
                    name="salaryMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Minimum Salary (USD / yr)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="80000"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={typeof field.value === "number" ? field.value : ""}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              field.onChange(val !== undefined && val < 0 ? 0 : val);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Max Salary */}
                  <FormField
                    control={form.control}
                    name="salaryMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Maximum Salary (USD / yr)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="120000"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={typeof field.value === "number" ? field.value : ""}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              field.onChange(val !== undefined && val < 0 ? 0 : val);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">Full Job Description & Responsibilities *</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={6}
                          placeholder="Describe the role, responsibilities, key qualifications, and tech stack..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Featured Toggle */}
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-xl border p-4 bg-muted/30">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 rounded border-input"
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-semibold cursor-pointer">
                        Mark as Featured Job Posting (Highlight listing on B2C search)
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      form.formState.isSubmitting || !form.formState.isValid
                    }
                    className="disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-bold"
                  >
                    {form.formState.isSubmitting ? "Publishing..." : "Publish Job Listing"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </JobQuotaGate>
  );
}
