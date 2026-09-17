import Link from "next/link";
import { ArrowLeft, Compass, Briefcase } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative mx-auto w-24 h-24 rounded-2xl bg-linear-to-tr from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
          <Compass className="w-12 h-12 text-primary animate-pulse" />
          <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold border border-destructive/20">
            404
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Page Not Found
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            The page or opportunity you are looking for might have been moved,
            expired, or no longer exists.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "w-full sm:w-auto gap-2 shadow-md shadow-primary/20",
            })}
          >
            <ArrowLeft className="w-4 h-4" />
            Explore Job Board
          </Link>
          <Link
            href="/employer/dashboard"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "w-full sm:w-auto gap-2",
            })}
          >
            <Briefcase className="w-4 h-4" />
            Employer Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
