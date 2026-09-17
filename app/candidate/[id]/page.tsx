"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import MainHeader from "@/components/MainHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Download,
  Share2,
  ExternalLink,
  Link2,
  Globe,
  FileText,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Building,
} from "lucide-react";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CandidatePublicProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const candidateId = resolvedParams.id;

  const data = useQuery(api.candidateProfiles.getCandidatePublicProfile, {
    userId: candidateId,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleShareProfile = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Profile link copied to clipboard!");
      }
    } catch {
      toast.error(
        "Failed to copy link. Please copy the URL from your browser.",
      );
    }
  };

  // Loading state skeleton
  if (data === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <MainHeader />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8 animate-pulse">
          <div className="h-6 w-32 bg-muted rounded-md" />

          {/* Hero skeleton */}
          <div className="p-8 rounded-2xl border border-border bg-card/60 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-3 w-full text-center sm:text-left">
              <div className="h-8 bg-muted rounded-md w-48 mx-auto sm:mx-0" />
              <div className="h-4 bg-muted rounded-md w-72 mx-auto sm:mx-0" />
              <div className="h-4 bg-muted rounded-md w-36 mx-auto sm:mx-0" />
              <div className="flex gap-2 pt-2 justify-center sm:justify-start">
                <div className="h-9 w-32 bg-muted rounded-lg" />
                <div className="h-9 w-28 bg-muted rounded-lg" />
              </div>
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-40 bg-muted/50 rounded-2xl border border-border/40" />
              <div className="h-64 bg-muted/50 rounded-2xl border border-border/40" />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <div className="h-48 bg-muted/50 rounded-2xl border border-border/40" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not found or not a candidate profile
  if (data === null) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <MainHeader />
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-20 flex flex-col items-center text-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Candidate Profile Not Found
          </h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            The profile you are looking for does not exist, has been made
            private, or is still being drafted.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Job Board
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { user, profile, defaultResume } = data;
  const headline = profile?.headline || "Professional Candidate";
  const location = profile?.location;
  const bio = profile?.bio;
  const skills = profile?.skills || [];
  const experience = profile?.experience || [];
  const education = profile?.education || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MainHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className:
                "text-xs text-muted-foreground hover:text-foreground -ml-2",
            })}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Job Listings
          </Link>

          <Button
            onClick={handleShareProfile}
            variant="outline"
            size="sm"
            className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Profile
          </Button>
        </div>

        {/* Hero Card */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              {user.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.imageUrl}
                  alt={user.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-border shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold border-2 border-border">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                title="Verified Nexora Candidate"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-card"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Core Info */}
            <div className="flex-1 text-center sm:text-left space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {user.name}
                </h1>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold self-center sm:self-auto"
                >
                  ● Open to Opportunities
                </Badge>
              </div>

              <p className="text-sm sm:text-base font-medium text-muted-foreground leading-snug max-w-2xl">
                {headline}
              </p>

              {/* Meta details */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground pt-1">
                {location && (
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    {location}
                  </span>
                )}
                <span className="flex items-center gap-1 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                  Candidate Portfolio
                </span>
              </div>

              {/* Action Buttons & Socials */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3">
                {defaultResume?.url && (
                  <a
                    href={defaultResume.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      size: "sm",
                      className:
                        "font-bold text-xs gap-1.5 shadow-xs cursor-pointer",
                    })}
                  >
                    <Download className="w-3.5 h-3.5" /> Download Verified
                    Resume
                    <span className="text-[10px] font-normal opacity-80 ml-1">
                      ({formatFileSize(defaultResume.fileSize)})
                    </span>
                  </a>
                )}

                {profile?.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "text-xs font-semibold gap-1.5",
                    })}
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#0A66C2]" /> LinkedIn
                  </a>
                )}

                {profile?.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "text-xs font-semibold gap-1.5",
                    })}
                  >
                    <Globe className="w-3.5 h-3.5 text-primary" /> Website /
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Main Column (About, Experience, Education) */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Me Section */}
            {bio && (
              <Card className="rounded-2xl border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> About Me
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Work Experience Timeline */}
            <Card className="rounded-2xl border-border shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Work
                    Experience
                  </CardTitle>
                  {experience.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold"
                    >
                      {experience.length}{" "}
                      {experience.length === 1 ? "Role" : "Roles"}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Professional career and key accomplishments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {experience.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No work experience listed on this profile yet.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {experience.map((exp, idx) => (
                      <div key={idx} className="relative group">
                        {/* Timeline node */}
                        <div
                          className={`absolute -left-6.75 top-1 w-3 h-3 rounded-full border-2 ${
                            exp.current
                              ? "bg-primary border-primary ring-4 ring-primary/20"
                              : "bg-card border-muted-foreground/40"
                          }`}
                        />

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">
                              {exp.position}
                            </h3>
                            {exp.current && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-semibold">
                                Current Role
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" /> {exp.company}
                            </span>
                            <span className="text-muted-foreground font-normal">
                              •
                            </span>
                            <span className="text-muted-foreground font-normal flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3" /> {exp.startDate} —{" "}
                              {exp.current ? "Present" : exp.endDate || "N/A"}
                            </span>
                          </div>

                          {exp.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line pt-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education Section */}
            <Card className="rounded-2xl border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" /> Education &
                  Credentials
                </CardTitle>
                <CardDescription className="text-xs">
                  Academic qualifications and degrees
                </CardDescription>
              </CardHeader>
              <CardContent>
                {education.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No education records listed on this profile yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border/70 bg-muted/10 space-y-1"
                      >
                        <h4 className="text-xs font-bold text-foreground">
                          {edu.degree}
                          {edu.field ? ` in ${edu.field}` : ""}
                        </h4>
                        <p className="text-xs font-medium text-primary">
                          {edu.institution}
                        </p>
                        {(edu.startDate || edu.endDate) && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                            <Calendar className="w-3 h-3" />
                            {edu.startDate || "N/A"} —{" "}
                            {edu.endDate || "Present"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right / Sidebar Column (Skills, Verified Resume Card, Profile Summary) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Skills Cloud Card */}
            <Card className="rounded-2xl border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Core
                  Competencies & Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No technical skills added yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs font-medium px-2.5 py-1 hover:bg-primary/10 hover:text-primary transition-colors cursor-default"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verified Resume Preview Card */}
            {defaultResume && (
              <Card className="rounded-2xl border-border shadow-xs bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Verified
                    Resume
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-xl border border-border bg-card flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">
                        {defaultResume.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(defaultResume.fileSize)} • Verified
                      </p>
                    </div>
                  </div>

                  {defaultResume.url && (
                    <a
                      href={defaultResume.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "w-full text-xs font-semibold gap-1.5",
                      })}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View PDF Resume
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Overview Card */}
            <Card className="rounded-2xl border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">
                  Candidate Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Open to Offers
                  </span>
                </div>
                {location && (
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-semibold">{location}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-semibold">
                    {experience.length > 0
                      ? `${experience.length} listed ${experience.length === 1 ? "position" : "positions"}`
                      : "Entry-level"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Nexora Member</span>
                  <span className="font-semibold text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
