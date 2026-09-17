"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { Building2 } from "lucide-react";

export default function MainHeader() {
  const pathname = usePathname();
  const myUser = useQuery(api.users.getMyUser);

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs transition-colors gap-2">
      <div className="flex items-center gap-3 sm:gap-8 min-w-0">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <Image
            src="/logo-icon.png"
            alt="Nexora Logo"
            width={34}
            height={34}
            className="w-7 sm:w-9 h-auto object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
            priority
          />
          <span className="font-extrabold text-lg sm:text-2xl tracking-tight text-foreground">
            Nexora
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {/* Candidate-specific navigation links */}
          <SignedIn>
            {myUser?.role !== "employer" && (
              <>
                <Link
                  href="/candidate/profile"
                  className={`transition-colors ${
                    pathname.startsWith("/candidate/profile")
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  My Profile
                </Link>
                <Link
                  href="/candidate/applications"
                  className={`transition-colors ${
                    pathname.startsWith("/candidate/applications")
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  My Applications
                </Link>
                <Link
                  href="/candidate/saved-jobs"
                  className={`transition-colors ${
                    pathname.startsWith("/candidate/saved-jobs")
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Saved Jobs
                </Link>
              </>
            )}
          </SignedIn>
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <ThemeToggle />

        {/* Show Employer portal button only for employers or signed-out guests */}
        {myUser?.role === "employer" ? (
          <Link href="/employer/dashboard" className="inline-flex">
            <Button
              variant="default"
              size="sm"
              className="text-xs font-semibold h-8 sm:h-9 px-2 sm:px-3 cursor-pointer"
              title="Employer Dashboard"
              aria-label="Employer Dashboard"
            >
              <span>🏢</span>
              <span className="hidden sm:inline ml-1.5">Employer Dashboard</span>
            </Button>
          </Link>
        ) : (
          <SignedOut>
            <Link href="/employer/dashboard" className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold h-8 sm:h-9 px-2 sm:px-3 cursor-pointer gap-1.5"
                title="For Employers"
                aria-label="For Employers"
              >
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">For Employers</span>
              </Button>
            </Link>
          </SignedOut>
        )}

        <SignedIn>
          <NotificationBell />
          <UserButton userProfileMode="modal" afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button size="sm" className="h-8 sm:h-9 px-2.5 sm:px-3 font-semibold text-xs cursor-pointer">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}
