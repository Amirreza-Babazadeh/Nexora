"use client";

import { useState, useEffect } from "react";
import { useOrganization, useAuth, PricingTable, Protect } from "@clerk/nextjs";
import { PlanTier } from "@/lib/orgHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  CreditCard,
  TableProperties,
  HelpCircle,
  Check,
  Minus,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const checkoutConfig = {
  appearance: {
    elements: {
      drawerBackdrop:
        "fixed inset-0 z-50 bg-transparent shadow-none backdrop-blur-none",
      drawerRoot:
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:w-[90vw] max-w-[520px] max-h-[88vh] mx-auto rounded-2xl shadow-2xl border border-border overflow-y-auto bg-card p-4 sm:p-6",
      drawerContent:
        "w-full h-auto shadow-none border-0 overflow-y-auto bg-transparent relative",
      drawerClose:
        "flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground absolute top-4 right-4 z-50 cursor-pointer shadow-xs transition-transform duration-200 hover:scale-110",
      modalBackdrop:
        "fixed inset-0 z-50 bg-transparent shadow-none backdrop-blur-none",
      modalContent:
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:w-[90vw] max-w-[520px] max-h-[88vh] mx-auto rounded-2xl shadow-2xl border border-border overflow-y-auto bg-card relative p-4 sm:p-6",
      modalCloseButton:
        "flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground absolute top-4 right-4 z-50 cursor-pointer shadow-xs transition-transform duration-200 hover:scale-110",
      card: "w-full mx-auto shadow-none border-0",
    },
  },
};

export default function PricingSection() {
  const { organization } = useOrganization();
  const { has } = useAuth();
  const [activeTab, setActiveTab] = useState<"plans" | "matrix" | "faq">(
    "plans",
  );

  // Observer to guarantee a close button is present on Clerk's in-app checkout popup
  useEffect(() => {
    const attachCloseButton = () => {
      const popup = document.querySelector<HTMLElement>(
        ".cl-drawerRoot, .cl-modalContent, .cl-statementRoot, div:has(> .cl-statementRoot), .cl-pricingTableCheckout",
      );
      if (!popup) return;

      const targetBox = popup.closest<HTMLElement>(".cl-drawerRoot") || popup;

      const existingBtn = targetBox.querySelector(
        ".cl-drawerClose, .cl-modalCloseButton, .nexora-clerk-close-btn, button[aria-label='Close'], button[data-localization-key='drawerClose'], button[data-localization-key='modalCloseButton']",
      );
      if (existingBtn) return;

      const closeBtn = document.createElement("button");
      closeBtn.className = "nexora-clerk-close-btn";
      closeBtn.setAttribute("type", "button");
      closeBtn.setAttribute("aria-label", "Close checkout");
      closeBtn.title = "Close";
      closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true,
          }),
        );

        const nativeClose = document.querySelector<HTMLButtonElement>(
          ".cl-drawerClose, .cl-modalCloseButton, button[data-localization-key='drawerClose'], button[data-localization-key='modalCloseButton']",
        );
        if (nativeClose) nativeClose.click();

        const backdrop = document.querySelector<HTMLElement>(
          ".cl-drawerBackdrop, .cl-modalBackdrop, div[data-clerk-backdrop]",
        );
        if (backdrop) backdrop.click();

        closeBtn.remove();
      };

      targetBox.appendChild(closeBtn);
    };

    const observer = new MutationObserver(() => {
      attachCloseButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    attachCloseButton();

    return () => observer.disconnect();
  }, []);

  // Use Clerk `has()` entitlement checks as the single source of truth
  const isPro = has?.({ plan: "pro" }) || has?.({ plan: "org:pro" });
  const isStarter =
    has?.({ plan: "starter" }) || has?.({ plan: "org:starter" });

  const activePlanTier: PlanTier = isPro
    ? "pro"
    : isStarter
      ? "starter"
      : (organization?.publicMetadata?.plan as PlanTier) || "free";

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-6xl w-full mx-auto py-2">
      {/* Header */}
      <div className="text-center flex flex-col gap-3">
        <div className="inline-flex items-center justify-center gap-2 self-center">
          <Badge
            variant="secondary"
            className="px-3.5 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border-primary/20"
          >
            Clerk Native B2B Billing
          </Badge>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Simple, Transparent Employer Plans
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          Scale your hiring pipeline with team seats, job posting quotas, and
          seamless Stripe-powered billing directly managed by Clerk.
        </p>

        {/* View Switcher Controls */}
        <div className="flex items-center justify-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/80 self-center mt-2 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "plans"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            Subscription Plans
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "matrix"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableProperties className="w-3.5 h-3.5 text-primary" />
            Feature Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "faq"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            Billing FAQ
          </button>
        </div>
      </div>

      {/* Tab 1: Clerk Native B2B Pricing Table */}
      {activeTab === "plans" && (
        <div className="space-y-4 w-full">
          <Protect
            role="org:admin"
            fallback={
              <Card className="border-border p-2 sm:p-6 text-center shadow-lg space-y-4 bg-card/60 w-full overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xl mx-auto">
                  🔒
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-bold">Organization Billing</h3>
                  <p className="text-xs text-muted-foreground">
                    You are viewing the organization pricing tiers. Organization
                    Admin access is required to modify subscription plans or
                    make checkout changes.
                  </p>
                </div>
                <div className="pt-2 w-full flex justify-center items-center overflow-x-hidden [&_.cl-pricingTable]:w-full [&_.cl-pricingTable]:max-w-full [&_.cl-pricingTable]:flex [&_.cl-pricingTable]:flex-col md:[&_.cl-pricingTable]:flex-row [&_.cl-pricingTable]:items-stretch md:[&_.cl-pricingTable]:justify-center [&_.cl-pricingTableCard]:w-full [&_.cl-pricingTableCard]:max-w-72.5 md:[&_.cl-pricingTableCard]:max-w-sm [&_.cl-pricingTableCard]:mx-auto [&_.cl-card]:mx-auto">
                  <PricingTable
                    for="organization"
                    checkoutProps={checkoutConfig}
                    appearance={{
                      elements: {
                        rootBox:
                          "w-full flex justify-center items-center mx-auto",
                        pricingTable:
                          "w-full max-w-full flex flex-col md:flex-row items-stretch justify-center mx-auto gap-4",
                        card: "w-full max-w-[290px] md:max-w-sm mx-auto",
                        pricingTableCard:
                          "w-full max-w-[290px] md:max-w-sm mx-auto",
                      },
                    }}
                  />
                </div>
              </Card>
            }
          >
            <Card className="border-border p-1.5 sm:p-6 shadow-xl bg-card w-full overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-foreground">
                    Direct Clerk Billing Gateway Active
                  </span>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold">
                  Current Tier:{" "}
                  <strong className="ml-1 text-primary capitalize">
                    {activePlanTier}
                  </strong>
                </Badge>
              </div>

              <div className="w-full flex justify-center items-center overflow-x-hidden [&_.cl-pricingTable]:w-full [&_.cl-pricingTable]:max-w-full [&_.cl-pricingTable]:flex [&_.cl-pricingTable]:flex-col md:[&_.cl-pricingTable]:flex-row [&_.cl-pricingTable]:items-stretch md:[&_.cl-pricingTable]:justify-center [&_.cl-pricingTableCard]:w-full [&_.cl-pricingTableCard]:max-w-72.5 md:[&_.cl-pricingTableCard]:max-w-sm [&_.cl-pricingTableCard]:mx-auto [&_.cl-card]:mx-auto">
                <PricingTable
                  for="organization"
                  checkoutProps={checkoutConfig}
                  appearance={{
                    elements: {
                      rootBox:
                        "w-full flex justify-center items-center mx-auto",
                      pricingTable:
                        "w-full max-w-full flex flex-col md:flex-row items-stretch justify-center mx-auto gap-4",
                      card: "w-full max-w-[290px] md:max-w-sm mx-auto",
                      pricingTableCard:
                        "w-full max-w-[290px] md:max-w-sm mx-auto",
                    },
                  }}
                />
              </div>
            </Card>
          </Protect>

          {/* Quick jump to feature comparison */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
            <span>Looking for a complete side-by-side feature comparison?</span>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className="font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View Feature Matrix <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Side-by-Side Feature Matrix */}
      {activeTab === "matrix" && (
        <Card className="border-border shadow-xl overflow-hidden bg-card">
          <CardHeader className="border-b border-border bg-muted/30 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Comprehensive
              Feature Comparison
            </CardTitle>
            <CardDescription className="text-xs">
              Review quotas, candidate pipeline capabilities, and support tiers
              across all employer plans.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[34%] font-bold text-xs">
                    Plan Features & Quotas
                  </TableHead>
                  <TableHead className="w-[22%] text-center">
                    <div className="font-extrabold text-sm text-foreground">
                      Free
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      $0 / month
                    </div>
                    {activePlanTier === "free" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] mt-1 h-4 font-bold text-emerald-600"
                      >
                        Current
                      </Badge>
                    )}
                  </TableHead>
                  <TableHead className="w-[22%] text-center bg-primary/5">
                    <div className="font-extrabold text-sm text-primary flex items-center justify-center gap-1">
                      Starter{" "}
                      <Badge
                        variant="default"
                        className="text-[9px] px-1 h-3.5"
                      >
                        Popular
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      $49 / month
                    </div>
                    {activePlanTier === "starter" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] mt-1 h-4 font-bold text-emerald-600"
                      >
                        Current
                      </Badge>
                    )}
                  </TableHead>
                  <TableHead className="w-[22%] text-center">
                    <div className="font-extrabold text-sm text-foreground">
                      Pro
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      $149 / month
                    </div>
                    {activePlanTier === "pro" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] mt-1 h-4 font-bold text-emerald-600"
                      >
                        Current
                      </Badge>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="text-xs">
                {/* Quotas Group */}
                <TableRow className="bg-muted/20 hover:bg-muted/20 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableCell colSpan={4}>Capacity & Quotas</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    Active Job Postings
                  </TableCell>
                  <TableCell className="text-center font-bold">1 Job</TableCell>
                  <TableCell className="text-center font-bold text-primary bg-primary/5">
                    10 Jobs
                  </TableCell>
                  <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                    Unlimited (∞)
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    Team Member Seats
                  </TableCell>
                  <TableCell className="text-center">1 Seat</TableCell>
                  <TableCell className="text-center font-semibold bg-primary/5">
                    Up to 10 Seats
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    Up to 25 Seats
                  </TableCell>
                </TableRow>

                {/* Candidate & Hiring Features */}
                <TableRow className="bg-muted/20 hover:bg-muted/20 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableCell colSpan={4}>Candidate Pipeline & Tools</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    Applicant Status Pipeline
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    Standard List
                  </TableCell>
                  <TableCell className="text-center font-semibold text-primary bg-primary/5">
                    Stage Kanban Board
                  </TableCell>
                  <TableCell className="text-center font-semibold text-primary">
                    Stage Kanban Board
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    Candidate Public Portfolio View
                  </TableCell>
                  <TableCell className="text-center">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                  <TableCell className="text-center bg-primary/5">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    Priority Candidate Alerts & Bell Notifications
                  </TableCell>
                  <TableCell className="text-center">
                    <Minus className="w-4 h-4 mx-auto text-muted-foreground/40" />
                  </TableCell>
                  <TableCell className="text-center bg-primary/5">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    ⭐ Featured Job Postings Placement
                  </TableCell>
                  <TableCell className="text-center">
                    <Minus className="w-4 h-4 mx-auto text-muted-foreground/40" />
                  </TableCell>
                  <TableCell className="text-center bg-primary/5">
                    <Minus className="w-4 h-4 mx-auto text-muted-foreground/40" />
                  </TableCell>
                  <TableCell className="text-center font-semibold text-amber-500">
                    Included (Top of Search)
                  </TableCell>
                </TableRow>

                {/* Support & Admin */}
                <TableRow className="bg-muted/20 hover:bg-muted/20 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableCell colSpan={4}>Administration & Support</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">
                    Role-Based Access (Org Admins & Members)
                  </TableCell>
                  <TableCell className="text-center">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                  <TableCell className="text-center bg-primary/5">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Check className="w-4 h-4 mx-auto text-emerald-500" />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Support SLA</TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    Standard Community
                  </TableCell>
                  <TableCell className="text-center font-medium bg-primary/5">
                    Priority Email (24h)
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">
                    Dedicated Account Manager
                  </TableCell>
                </TableRow>

                {/* Action Row */}
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell className="font-bold">Select Plan</TableCell>
                  <TableCell className="text-center">
                    {activePlanTier === "free" ? (
                      <span className="text-xs font-bold text-muted-foreground">
                        Current Plan
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("plans")}
                        className="text-xs h-7"
                      >
                        Select
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center bg-primary/5">
                    {activePlanTier === "starter" ? (
                      <span className="text-xs font-bold text-primary">
                        Current Plan
                      </span>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setActiveTab("plans")}
                        className="text-xs h-7 font-bold"
                      >
                        Choose Starter
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {activePlanTier === "pro" ? (
                      <span className="text-xs font-bold text-emerald-600">
                        Current Plan
                      </span>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setActiveTab("plans")}
                        className="text-xs h-7 font-bold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        Upgrade to Pro
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Billing FAQ */}
      {activeTab === "faq" && (
        <Card className="border-border shadow-xl p-6 bg-card space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border/60">
              <h4 className="font-bold text-sm text-foreground">
                How do job quotas work?
              </h4>
              <p className="text-muted-foreground">
                Quotas apply to simultaneously active job listings. If your plan
                allows 10 jobs, you can have 10 open at any one time. When you
                close or fulfill a listing, that slot immediately becomes
                available again.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border/60">
              <h4 className="font-bold text-sm text-foreground">
                Can I invite additional team members?
              </h4>
              <p className="text-muted-foreground">
                Yes! The Starter plan includes up to 10 seats, while the Pro
                plan accommodates up to 25 seats. Team members can review
                applications and manage candidates collaboratively.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border/60">
              <h4 className="font-bold text-sm text-foreground">
                How does plan upgrading work?
              </h4>
              <p className="text-muted-foreground">
                Upgrades occur in real-time through Clerk Billing. Unused time
                on your current plan is automatically prorated toward your new
                subscription tier.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border/60">
              <h4 className="font-bold text-sm text-foreground">
                Can I cancel anytime?
              </h4>
              <p className="text-muted-foreground">
                Yes, there are no long-term contracts. You can cancel or
                downgrade your subscription directly from this billing portal.
                Your active benefits continue until the end of the billing
                cycle.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
