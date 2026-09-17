"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

export default function EmployerHeader() {
  const pathname = usePathname();
  const { organization, isLoaded } = useOrganization();

  const navLinks = [
    { href: "/employer/dashboard", label: "Dashboard" },
    { href: "/employer/post-job", label: "Post a Job" },
    { href: "/employer/applications", label: "Applications" },
    { href: "/employer/saved-jobs", label: "Saved Jobs" },
    { href: "/employer/billing", label: "Billing", badge: "Plans" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md text-foreground border-b border-border shadow-xs transition-colors">
      {/* Main Top Bar */}
      <div className="px-2.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left Brand & Desktop Nav */}
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group shrink-0">
            <Image
              src="/logo-icon.png"
              alt="Nexora Logo"
              width={32}
              height={32}
              className="w-7 sm:w-8 h-auto object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
              priority
            />
            <span className="font-bold text-sm min-[360px]:text-base sm:text-xl tracking-tight text-foreground truncate">
              Nexora{" "}
              <span className="hidden sm:inline text-[10px] sm:text-xs font-normal text-primary border border-primary/30 px-1.5 sm:px-2 py-0.5 rounded-full ml-0.5">
                Employer
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          {isLoaded && organization && (
            <nav className="hidden md:flex items-center gap-5 text-xs sm:text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors flex items-center gap-1.5 ${
                      isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.label}
                    {link.badge && (
                      <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-primary/20">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Light & Dark Mode Switcher */}
          <ThemeToggle />

          {/* Organization Switcher with high-contrast Light/Dark mode styling */}
          <OrganizationSwitcher
            hidePersonal={true}
            afterSelectOrganizationUrl="/employer/dashboard"
            afterCreateOrganizationUrl="/employer/dashboard"
            appearance={{
              elements: {
                rootBox: "flex items-center justify-center",
                organizationSwitcherTrigger:
                  "bg-muted hover:bg-accent text-foreground px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-border text-[11px] sm:text-xs font-semibold transition-colors max-w-[70px] min-[360px]:max-w-[100px] sm:max-w-none truncate",
                organizationPreviewTextContainer: "text-foreground font-semibold text-xs truncate",
                organizationSwitcherTriggerIcon: "text-foreground opacity-80 ml-0.5 sm:ml-1 shrink-0",
                organizationPreviewMainIdentifier: "text-foreground font-semibold text-xs",
                organizationPreviewSecondaryIdentifier: "text-muted-foreground text-xs",
              },
            }}
          />

          {/* User Account Button */}
          <UserButton
            userProfileMode="modal"
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-7 h-7 sm:w-8.5 sm:h-8.5 border border-border shadow-xs",
              },
            }}
          />
        </div>
      </div>

      {/* Mobile Responsive Navigation Bar */}
      {isLoaded && organization && (
        <div className="md:hidden border-t border-border/60 bg-muted/30 px-4 py-2 flex items-center justify-around text-xs font-semibold overflow-x-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
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
      )}
    </header>
  );
}
