"use client";

import { useState } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function DataSeederModal() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  // Input states pre-populated with active Clerk credentials
  const [userIdInput, setUserIdInput] = useState(user?.id ?? "");
  const [orgIdInput, setOrgIdInput] = useState(organization?.id ?? "");
  const [orgNameInput, setOrgNameInput] = useState(organization?.name ?? "");
  const [userNameInput, setUserNameInput] = useState(user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "");

  const [isSeedingWorkspace, setIsSeedingWorkspace] = useState(false);
  const [isSeedingPublic, setIsSeedingPublic] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const seedWorkspaceMutation = useMutation(api.seed.seedUserWorkspaceData);
  const seedPublicMutation = useMutation(api.seed.seedPublicDemoData);
  const clearDataMutation = useMutation(api.seed.clearAllData);

  // Sync inputs when modal opens or user/org updates
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      if (!userIdInput && user?.id) setUserIdInput(user.id);
      if (!orgIdInput && organization?.id) setOrgIdInput(organization.id);
      if (!orgNameInput && organization?.name) setOrgNameInput(organization.name);
      if (!userNameInput && (user?.fullName || user?.primaryEmailAddress?.emailAddress)) {
        setUserNameInput(user?.fullName || user?.primaryEmailAddress?.emailAddress || "");
      }
    }
  };

  const handleSeedWorkspace = async () => {
    if (!userIdInput || !orgIdInput) {
      toast.error("Please enter a valid Clerk User ID and Organization ID.");
      return;
    }

    setIsSeedingWorkspace(true);
    try {
      const res = await seedWorkspaceMutation({
        clerkUserId: userIdInput.trim(),
        clerkOrgId: orgIdInput.trim(),
        userName: userNameInput.trim() || undefined,
        userEmail: user?.primaryEmailAddress?.emailAddress || undefined,
        orgName: orgNameInput.trim() || undefined,
      });

      toast.success(res.message);
      setIsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed workspace data.");
    } finally {
      setIsSeedingWorkspace(false);
    }
  };

  const handleSeedPublicDemo = async () => {
    setIsSeedingPublic(true);
    try {
      const res = await seedPublicMutation();
      toast.success(res.message);
      setIsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed public demo data.");
    } finally {
      setIsSeedingPublic(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm("Are you sure you want to clear all seeded jobs and candidate applications?")) {
      return;
    }

    setIsClearing(true);
    try {
      const res = await clearDataMutation();
      toast.success(`Cleared ${res.deletedJobs} jobs and ${res.deletedApps} applications.`);
      setIsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear database data.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-xs border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-xs">
            🌱 Seed Demo Data
          </Button>
        }
      />

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            🌱 Database Data Seeder
            <Badge variant="secondary" className="text-[10px]">Admin Tool</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Seed mock job listings and candidate applications into your active Clerk Organization or populate public B2C search demo data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Active Workspace Seeder Card */}
          <Card className="border-border bg-card/60 p-4 space-y-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>🏢 Seed Active Organization Data</span>
                {organization && <Badge variant="outline" className="text-[10px]">{organization.name}</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">
                Pass your Clerk User ID and Organization ID below to generate 5 active job postings and 15 candidate applications for your hiring dashboard.
              </CardDescription>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Clerk User ID *</Label>
                  <Input
                    placeholder="user_..."
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Clerk Organization ID *</Label>
                  <Input
                    placeholder="org_..."
                    value={orgIdInput}
                    onChange={(e) => setOrgIdInput(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Organization Name</Label>
                  <Input
                    placeholder="Company Name"
                    value={orgNameInput}
                    onChange={(e) => setOrgNameInput(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">User Full Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <Button
                onClick={handleSeedWorkspace}
                disabled={isSeedingWorkspace || !userIdInput || !orgIdInput}
                className="w-full font-bold text-xs h-9"
              >
                {isSeedingWorkspace ? "Seeding Workspace..." : "⚡ Seed My Active Workspace Data"}
              </Button>
            </div>
          </Card>

          {/* General Public & Cleanup Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold">Public Demo Companies</h4>
                <p className="text-[11px] text-muted-foreground">
                  Seed fake jobs & applications for Stripe, Vercel, Convex, OpenAI & Figma to populate B2C search.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSeedPublicDemo}
                disabled={isSeedingPublic}
                className="w-full text-xs font-semibold"
              >
                {isSeedingPublic ? "Seeding..." : "🌐 Seed Public Demo Data"}
              </Button>
            </Card>

            <Card className="p-4 space-y-3 flex flex-col justify-between border-destructive/30 bg-destructive/5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-destructive">Wipe All Test Data</h4>
                <p className="text-[11px] text-muted-foreground">
                  Clear all seeded job listings and applicant records from the Convex cloud database.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearData}
                disabled={isClearing}
                className="w-full text-xs font-semibold"
              >
                {isClearing ? "Clearing..." : "🗑️ Clear All Database Data"}
              </Button>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
