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

  const candidateNavLinks = [
    { href: "/", label: "Find Jobs" },
    ...(myUser?.role !== "employer"
      ? [
          { href: "/candidate/profile", label: "My Profile" },
          { href: "/candidate/applications", label: "My Applications" },
          { href: "/candidate/saved-jobs", label: "Saved Jobs" },
        ]
      : [{ href: "/employer/dashboard", label: "Employer Portal" }]),
  ];

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shadow-xs transition-colors">
      {/* Main Top Bar */}
      <div className="px-2.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group shrink-0">
            <Image
              src="/logo-icon.png"
              alt="Nexora Logo"
              width={32}
              height={32}
              className="w-7 sm:w-8 h-auto object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
              priority
            />
            <span className="font-extrabold text-base sm:text-2xl tracking-tight text-foreground">
              Nexora
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link
              href="/"
              className={`transition-colors ${
                pathname === "/"
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Find Jobs
            </Link>

            <SignedIn>
              {myUser?.role !== "employer" && (
                <>
                  <Link
                    href="/candidate/profile"
                    className={`transition-colors ${
                      pathname.startsWith("/candidate/profile")
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/candidate/applications"
                    className={`transition-colors ${
                      pathname.startsWith("/candidate/applications")
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    My Applications
                  </Link>
                  <Link
                    href="/candidate/saved-jobs"
                    className={`transition-colors ${
                      pathname.startsWith("/candidate/saved-jobs")
                        ? "text-primary font-bold"
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

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <ThemeToggle />

          {/* Show Employer portal button only for employers or signed-out guests */}
          {myUser?.role === "employer" ? (
            <Link href="/employer/dashboard" className="inline-flex">
              <Button
                variant="default"
                size="sm"
                className="text-[11px] sm:text-xs font-semibold h-7 sm:h-9 px-2 sm:px-3 cursor-pointer"
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
                  className="text-[11px] sm:text-xs font-semibold h-7 sm:h-9 px-2 sm:px-3 cursor-pointer gap-1"
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
            <UserButton
              userProfileMode="modal"
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7 sm:w-8.5 sm:h-8.5 border border-border shadow-xs",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm" className="h-7 sm:h-9 px-2.5 sm:px-3 font-semibold text-xs cursor-pointer">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      {/* Mobile Responsive Navigation Bar (Matches Employer Header Sub-Nav) */}
      <div className="md:hidden border-t border-border/60 bg-muted/30 px-3 py-1.5 flex items-center justify-around text-xs font-semibold overflow-x-auto gap-1">
        {candidateNavLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
