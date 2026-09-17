"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  UploadCloud,
  Trash2,
  ExternalLink,
  Star,
  Loader2,
  AlertCircle,
  Clock,
  FileQuestion,
} from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_RESUMES_PER_CANDIDATE = 5;
const MAX_FILENAME_LENGTH = 80;

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

interface ResumeItem {
  _id: Id<"resumes">;
  _creationTime: number;
  userId: Id<"users">;
  storageId: Id<"_storage">;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  url: string | null;
  isMissingFile?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function getFileTypeBadge(filename: string, mimeType: string): string {
  const ext = getFileExtension(filename);
  if (ext === "pdf" || mimeType.includes("pdf")) return "PDF";
  if (ext === "docx" || mimeType.includes("openxmlformats")) return "DOCX";
  if (ext === "doc" || mimeType.includes("msword")) return "DOC";
  return ext.toUpperCase() || "FILE";
}

export default function ResumeManager() {
  const resumes = useQuery(api.resumes.getMyResumes);
  const generateUploadUrl = useMutation(api.resumes.generateResumeUploadUrl);
  const createResume = useMutation(api.resumes.createResume);
  const setDefaultResume = useMutation(api.resumes.setDefaultResume);
  const deleteResume = useMutation(api.resumes.deleteResume);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [settingDefaultId, setSettingDefaultId] =
    useState<Id<"resumes"> | null>(null);
  const [resumeToDelete, setResumeToDelete] = useState<ResumeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAtLimit = (resumes?.length ?? 0) >= MAX_RESUMES_PER_CANDIDATE;

  // Validate file on the client before network upload
  const validateFile = (file: File): string | null => {
    // 1. Validate 5-resume limit
    if (isAtLimit) {
      return "You can upload a maximum of 5 resumes.";
    }

    // 2. Validate filename presence, length and characters
    const cleanName = file.name.trim();
    if (!cleanName) {
      return "File name cannot be empty.";
    }

    if (cleanName.length > MAX_FILENAME_LENGTH) {
      return "File name must be 80 characters or fewer.";
    }

    if (cleanName.includes("/") || cleanName.includes("\\")) {
      return "File name contains invalid characters.";
    }

    // 3. Validate duplicate filename (case-insensitive)
    const lowerName = cleanName.toLowerCase();
    if (
      resumes?.some((r: ResumeItem) => r.fileName.toLowerCase() === lowerName)
    ) {
      return "A resume with this file name already exists.";
    }

    // 4. Validate extension
    const ext = getFileExtension(cleanName);
    if (!["pdf", "doc", "docx"].includes(ext)) {
      return "Unsupported file type. Please upload a PDF, DOC, or DOCX document.";
    }

    // 5. Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${formatFileSize(file.size)}) exceeds the maximum 5 MB limit.`;
    }

    if (file.size === 0) {
      return "The selected file is empty. Please select a valid resume document.";
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    // Guard against concurrent uploads
    if (isUploading) return;

    const errorMsg = validateFile(file);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    setIsUploading(true);

    try {
      // 1. Request secure Convex Storage upload URL
      const uploadUrl = await generateUploadUrl();

      // Determine appropriate mime type
      const ext = getFileExtension(file.name);
      const mimeType = file.type || MIME_MAP[ext] || "application/pdf";

      // 2. Upload file directly to Convex Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload binary file to secure storage.");
      }

      const { storageId } = await uploadResponse.json();

      // 3. Save resume metadata and reference in Convex database
      await createResume({
        storageId,
        fileName: file.name.trim(),
        fileSize: file.size,
        mimeType,
      });

      toast.success(`Resume "${file.name.trim()}" uploaded successfully!`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to upload resume. Please try again.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isUploading || isAtLimit) return;
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    // Guard against concurrent uploads and limit
    if (isUploading) return;
    if (isAtLimit) {
      toast.error("You can upload a maximum of 5 resumes.");
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleSetDefault = async (resume: ResumeItem) => {
    if (resume.isDefault) return;
    setSettingDefaultId(resume._id);
    try {
      await setDefaultResume({ resumeId: resume._id });
      toast.success(`"${resume.fileName}" set as your default resume.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to set default resume.",
      );
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!resumeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteResume({ resumeId: resumeToDelete._id });
      toast.success(`"${resumeToDelete.fileName}" was deleted.`);
      setResumeToDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete resume.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = resumes === undefined;

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resumes & Documents
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Upload and manage your tailored resumes. Exactly one resume is
              designated as your default for job applications.
            </CardDescription>
          </div>
          {resumes && resumes.length > 0 && (
            <Badge
              variant="secondary"
              className="self-start sm:self-auto text-xs font-semibold"
            >
              {resumes.length} {resumes.length === 1 ? "Resume" : "Resumes"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Loading your resumes...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && resumes.length === 0 && (
          <div className="border border-dashed border-border rounded-xl p-8 text-center flex flex-col items-center gap-3 bg-muted/10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold tracking-tight">
                No resumes yet
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
                Upload your resume to make it easier to apply for jobs and
                showcase your qualifications to employers.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-2 font-semibold text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Upload Resume
                </>
              )}
            </Button>
          </div>
        )}

        {/* Resume List */}
        {!isLoading && resumes && resumes.length > 0 && (
          <div className="space-y-3">
            {resumes.map((resume: ResumeItem) => {
              const fileType = getFileTypeBadge(
                resume.fileName,
                resume.mimeType,
              );
              const formattedDate = new Date(
                resume.createdAt,
              ).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={resume._id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    resume.isDefault
                      ? "bg-primary/5 border-primary/40 shadow-xs"
                      : "bg-card hover:bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        resume.isDefault
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {fileType}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-sm truncate max-w-70 sm:max-w-md"
                          title={resume.fileName}
                        >
                          {resume.fileName}
                        </span>
                        {resume.isDefault && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 gap-1 shadow-xs">
                            <Star className="w-3 h-3 fill-current" /> Default
                            Resume
                          </Badge>
                        )}
                        {resume.isMissingFile && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] gap-1"
                          >
                            <AlertCircle className="w-3 h-3" /> File Missing in
                            Storage
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{formatFileSize(resume.fileSize)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Added {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    {/* View / Download Button */}
                    {resume.url ? (
                      <a
                        href={resume.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "text-xs font-semibold gap-1.5 hover:text-primary transition-colors cursor-pointer",
                        )}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-xs font-semibold gap-1.5 opacity-50"
                        title="Storage file is not available"
                      >
                        <FileQuestion className="w-3.5 h-3.5" /> Unavailable
                      </Button>
                    )}

                    {/* Set as Default Button */}
                    {!resume.isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(resume)}
                        disabled={settingDefaultId === resume._id}
                        className="text-xs font-semibold gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      >
                        {settingDefaultId === resume._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Star className="w-3.5 h-3.5" />
                        )}
                        Set Default
                      </Button>
                    )}

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setResumeToDelete(resume)}
                      className="text-xs font-semibold gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sr-only sm:not-sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Zone (shown when resumes exist or during upload) */}
        {!isLoading && (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center gap-2.5 ${
              isDragging
                ? "border-primary bg-primary/10 scale-[1.005]"
                : "border-border hover:border-primary/50 bg-muted/10"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onFileInputChange}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
              </div>

              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold">
                  {isUploading
                    ? "Uploading resume to secure storage..."
                    : "Upload an additional resume or drop your file here"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Supported formats: PDF, DOC, DOCX • Maximum file size: 5 MB
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="ml-auto text-xs font-semibold shrink-0 cursor-pointer"
              >
                {isUploading ? "Uploading..." : "Select File"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!resumeToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setResumeToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Resume
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm pt-2">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground font-semibold">
                &ldquo;{resumeToDelete?.fileName}&rdquo;
              </strong>
              ?
              {resumeToDelete?.isDefault && resumes && resumes.length > 1 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  Note: This is currently your default resume. Another remaining
                  resume will automatically be promoted to default.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResumeToDelete(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
