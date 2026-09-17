"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  candidateProfileSchema,
  CandidateProfileFormValues,
} from "@/lib/schemas";

import MainHeader from "@/components/MainHeader";
import ResumeManager from "@/components/ResumeManager";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  Link2,
  MapPin,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const POPULAR_SKILLS = [
  "React",
  "TypeScript",
  "Next.js",
  "Node.js",
  "Python",
  "Tailwind CSS",
  "PostgreSQL",
  "GraphQL",
  "Docker",
  "AWS",
  "Figma",
  "System Design",
];

export default function CandidateProfilePage() {
  const router = useRouter();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const myUser = useQuery(api.users.getMyUser);
  const myProfile = useQuery(api.candidateProfiles.getMyCandidateProfile);
  const saveProfile = useMutation(api.candidateProfiles.saveMyCandidateProfile);

  const [skillInput, setSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guide authenticated users without a Convex user record to /onboarding
  useEffect(() => {
    if (!isConvexAuthLoading && isAuthenticated && myUser === null) {
      router.push("/onboarding");
    }
  }, [isConvexAuthLoading, isAuthenticated, myUser, router]);

  const form = useForm<CandidateProfileFormValues>({
    resolver: zodResolver(candidateProfileSchema),
    mode: "onChange",
    defaultValues: {
      headline: "",
      location: "",
      bio: "",
      skills: [],
      experience: [],
      education: [],
      linkedinUrl: "",
      portfolioUrl: "",
    },
  });

  const {
    fields: expFields,
    append: appendExp,
    remove: removeExp,
  } = useFieldArray({
    control: form.control,
    name: "experience",
  });

  const {
    fields: eduFields,
    append: appendEdu,
    remove: removeEdu,
  } = useFieldArray({
    control: form.control,
    name: "education",
  });

  // Populate form when profile query returns existing data
  useEffect(() => {
    if (myProfile) {
      form.reset({
        headline: myProfile.headline ?? "",
        location: myProfile.location ?? "",
        bio: myProfile.bio ?? "",
        skills: myProfile.skills ?? [],
        experience: myProfile.experience ?? [],
        education: myProfile.education ?? [],
        linkedinUrl: myProfile.linkedinUrl ?? "",
        portfolioUrl: myProfile.portfolioUrl ?? "",
      });
    }
  }, [myProfile, form]);

  const currentSkills =
    useWatch({
      control: form.control,
      name: "skills",
    }) ?? [];

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (currentSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.info(`"${trimmed}" is already in your skills list`);
      setSkillInput("");
      return;
    }
    form.setValue("skills", [...currentSkills, trimmed], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setSkillInput("");
  };

  const handleRemoveSkill = (indexToRemove: number) => {
    form.setValue(
      "skills",
      currentSkills.filter((_, idx) => idx !== indexToRemove),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onSubmit = async (values: CandidateProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await saveProfile({
        headline: values.headline || undefined,
        location: values.location || undefined,
        bio: values.bio || undefined,
        skills: values.skills.length > 0 ? values.skills : undefined,
        experience: values.experience.length > 0 ? values.experience : undefined,
        education: values.education.length > 0 ? values.education : undefined,
        linkedinUrl: values.linkedinUrl || undefined,
        portfolioUrl: values.portfolioUrl || undefined,
      });

      toast.success(
        myProfile ? "Profile updated successfully!" : "Profile created successfully!"
      );
      form.reset(values);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save candidate profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (!isAuthLoaded || isConvexAuthLoading || (isAuthenticated && (myUser === undefined || myProfile === undefined))) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <MainHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground text-sm font-medium">
              Loading your candidate profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated Guard
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4 shadow-xl border-border">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center font-bold text-xl">
              🔑
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Sign In Required</h2>
            <p className="text-muted-foreground text-sm">
              Please sign in to create and manage your candidate profile.
            </p>
            <Button onClick={() => router.push("/sign-in")} className="w-full font-medium">
              Go to Sign In
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  // Role Guard: Only candidate role can access candidate profile
  if (myUser?.role === "employer") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4 shadow-xl border-border">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center font-bold text-xl">
              🛡️
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Employer Account Detected</h2>
            <p className="text-muted-foreground text-sm">
              Your Nexora account is registered as an <strong>Employer</strong>. The Candidate Profile page is reserved for job seekers.
            </p>
            <Link href="/employer/dashboard" className="w-full mt-2">
              <Button className="w-full font-medium">Go to Employer Dashboard</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const fullName = `${myUser?.firstName || ""} ${myUser?.lastName || ""}`.trim() || clerkUser?.fullName || "Candidate";
  const userEmail = myUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || "";
  const profileCreated = !!myProfile;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <MainHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 md:py-10 flex flex-col gap-8">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <Briefcase className="w-3.5 h-3.5" /> Candidate Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Candidate Profile
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Showcase your skills, experience, and background to top companies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {myUser?._id && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (typeof window !== "undefined") {
                      const url = `${window.location.origin}/candidate/${myUser._id}`;
                      await navigator.clipboard.writeText(url);
                      toast.success("Public profile link copied to clipboard!");
                    }
                  }}
                  className="text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" /> Copy Public Link
                </Button>

                <Link
                  href={`/candidate/${myUser._id}`}
                  target="_blank"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "text-xs font-semibold gap-1.5 shadow-xs cursor-pointer",
                  })}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Public Profile
                </Link>
              </>
            )}

            <Badge
              variant={profileCreated ? "secondary" : "outline"}
              className="px-3 py-1.5 text-xs font-semibold gap-1.5"
            >
              {profileCreated ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Profile Active
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Incomplete Profile
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Identity Model Card (Read-Only from Clerk/Nexora Identity) */}
        <Card className="border-border shadow-xs bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">{fullName}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{userEmail}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Candidate Account
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground border-t border-border/60 mt-2 p-4 bg-muted/20 rounded-b-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary shrink-0" />
            <span>
              Your account identity (name & email) is managed via your Clerk sign-in. Professional profile details below are specific to your Nexora candidate portfolio.
            </span>
          </CardContent>
        </Card>

        {/* Candidate Resume Upload & Management */}
        <ResumeManager />

        {/* Profile Edit Form */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              const firstError =
                errors.headline?.message ||
                errors.bio?.message ||
                errors.location?.message ||
                errors.linkedinUrl?.message ||
                errors.portfolioUrl?.message ||
                "Please fix errors in your profile before saving.";
              toast.error(firstError);
            })}
            className="flex flex-col gap-8"
          >
            {/* Section 1: Basic Information */}
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Basic Information
                </CardTitle>
                <CardDescription>
                  Your public headline, location, and professional summary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm">Professional Headline</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Senior Full-Stack Engineer | React, TypeScript & Node.js"
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <FormDescription>
                          A concise summary of your current title and specialty.
                        </FormDescription>
                        <span>{field.value?.length || 0}/100</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-muted-foreground" /> Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. San Francisco, CA (or Remote)"
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        City, region, or your preferred remote working timezone.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-muted-foreground" /> About Me / Bio
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write a brief professional summary about your background, achievements, and what kind of roles you are seeking..."
                          rows={4}
                          maxLength={1000}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <FormDescription>
                          Briefly summarize your engineering background and career goals.
                        </FormDescription>
                        <span>{field.value?.length || 0}/1000</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Skills */}
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Skills & Technologies
                </CardTitle>
                <CardDescription>
                  Add your primary programming languages, frameworks, tools, and areas of expertise.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Skill input + Add button */}
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. React, TypeScript, GraphQL, Python..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill(skillInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddSkill(skillInput)}
                    className="font-semibold cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Skill
                  </Button>
                </div>

                {/* Selected Skills Chips */}
                {currentSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {currentSkills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-foreground"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(idx)}
                          className="hover:text-destructive transition-colors cursor-pointer ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic pt-1">
                    No skills added yet. Type a skill above and press enter or click Add.
                  </p>
                )}

                {/* Popular Skill Suggestions */}
                <div className="pt-3 border-t border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Suggested popular skills:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SKILLS.filter(
                      (ps) => !currentSkills.some((s) => s.toLowerCase() === ps.toLowerCase())
                    ).map((ps) => (
                      <button
                        key={ps}
                        type="button"
                        onClick={() => handleAddSkill(ps)}
                        className="text-xs bg-muted/60 hover:bg-muted hover:text-primary text-muted-foreground px-2.5 py-1 rounded-md border border-border/80 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {ps}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Work Experience */}
            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" /> Work Experience
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Highlight your career history and notable positions.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendExp({
                      company: "",
                      position: "",
                      startDate: "",
                      endDate: "",
                      current: false,
                      description: "",
                    })
                  }
                  className="font-semibold text-xs cursor-pointer gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Role
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                {expFields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2">
                    <Briefcase className="w-8 h-8 text-muted-foreground/60" />
                    <p className="text-sm font-semibold text-foreground">No experience entries added</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Adding your work history gives employers a clear view of your background and achievements.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendExp({
                          company: "",
                          position: "",
                          startDate: "",
                          endDate: "",
                          current: false,
                          description: "",
                        })
                      }
                      className="mt-2 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Your First Experience
                    </Button>
                  </div>
                ) : (
                  expFields.map((field, index) => (
                    <ExperienceCardItem
                      key={field.id}
                      index={index}
                      control={form.control}
                      setValue={form.setValue}
                      onRemove={() => removeExp(index)}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Section 4: Education */}
            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" /> Education
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Degrees, certifications, and academic institutions.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendEdu({
                      institution: "",
                      degree: "",
                      field: "",
                      startDate: "",
                      endDate: "",
                    })
                  }
                  className="font-semibold text-xs cursor-pointer gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Education
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                {eduFields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2">
                    <GraduationCap className="w-8 h-8 text-muted-foreground/60" />
                    <p className="text-sm font-semibold text-foreground">No education entries added</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Include your university degree, bootcamp, or major certifications.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendEdu({
                          institution: "",
                          degree: "",
                          field: "",
                          startDate: "",
                          endDate: "",
                        })
                      }
                      className="mt-2 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Education
                    </Button>
                  </div>
                ) : (
                  eduFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-5 rounded-xl border border-border bg-card/60 relative space-y-4 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">
                          Education #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEdu(index)}
                          className="text-destructive hover:bg-destructive/10 h-8 px-2 text-xs cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`education.${index}.institution`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">School / University *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Stanford University" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`education.${index}.degree`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">Degree / Certification *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Bachelor of Science" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`education.${index}.field`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">Field of Study</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Computer Science" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`education.${index}.startDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">Start Year</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 2018" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`education.${index}.endDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">Graduation Year</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 2022" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Section 5: Online Presence & Links */}
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" /> Links & Social Profiles
                </CardTitle>
                <CardDescription>
                  Add links to your professional LinkedIn and portfolio website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-blue-500" /> LinkedIn Profile
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://linkedin.com/in/yourusername"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Direct link to your verified LinkedIn account.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portfolioUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-emerald-500" /> Portfolio / GitHub / Personal Site
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://yourportfolio.dev"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Your developer portfolio, GitHub profile, or personal blog.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Bar - Only shown when there are unsaved changes */}
            {form.formState.isDirty && (
              <div className="sticky bottom-6 z-20 bg-card/95 backdrop-blur-md border border-border p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    ● Unsaved changes
                  </span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || !form.formState.isValid}
                  className="font-bold cursor-pointer px-8 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {profileCreated ? "Save Changes" : "Create Profile"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </main>
    </div>
  );
}

function ExperienceCardItem({
  index,
  control,
  setValue,
  onRemove,
}: {
  index: number;
  control: Control<CandidateProfileFormValues>;
  setValue: UseFormSetValue<CandidateProfileFormValues>;
  onRemove: () => void;
}) {
  const isCurrent = useWatch({
    control,
    name: `experience.${index}.current` as const,
  });

  return (
    <div className="p-5 rounded-xl border border-border bg-card/60 relative space-y-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Position #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10 h-8 px-2 text-xs cursor-pointer"
        >
          <Trash2 className="w-4 h-4 mr-1" /> Remove
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`experience.${index}.company`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">Company Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`experience.${index}.position`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">Job Title / Role *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Senior Frontend Engineer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`experience.${index}.startDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">Start Date *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Jan 2022" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`experience.${index}.endDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">
                End Date {isCurrent ? "(Current)" : ""}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Present or Dec 2024"
                  disabled={isCurrent}
                  {...field}
                  value={isCurrent ? "Present" : field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name={`experience.${index}.current`}
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0 pt-1">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => {
                  field.onChange(e.target.checked);
                  if (e.target.checked) {
                    setValue(`experience.${index}.endDate`, "Present", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  } else {
                    setValue(`experience.${index}.endDate`, "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
              />
            </FormControl>
            <FormLabel className="text-xs font-medium cursor-pointer">
              I currently work in this position
            </FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`experience.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold">
              Key Responsibilities & Achievements
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the projects you delivered, technologies you used, and team impact..."
                rows={3}
                maxLength={1000}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

