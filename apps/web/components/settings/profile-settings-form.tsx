"use client";

import * as React from "react";
import { Check, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { updateUserProfile } from "@/app/actions";

interface ProfileSettingsFormProps {
  initialData: {
    niche: string | null;
    targetRoles: string[];
    targetChains: string[];
    skills: string[];
    portfolioUrl: string | null;
    githubUrl: string | null;
    cvText: string | null;
  };
}

const availableRoles = [
  "Product / UI design",
  "Frontend development",
  "Smart contracts & audit",
  "Community & growth",
  "Content & brand",
  "Research & strategy",
];

const availableChains = [
  "Ethereum",
  "Solana",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "Stacks",
  "Multichain",
];

export function ProfileSettingsForm({ initialData }: ProfileSettingsFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>(initialData.targetRoles);
  const [selectedChains, setSelectedChains] = React.useState<string[]>(initialData.targetChains);

  const handleSubmit = (formData: FormData) => {
    setSavedSuccess(false);
    startTransition(async () => {
      // Append checked roles and chains
      formData.delete("roles");
      selectedRoles.forEach((r) => formData.append("roles", r));
      formData.delete("chains");
      selectedChains.forEach((c) => formData.append("chains", c));

      await updateUserProfile(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    });
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const toggleChain = (chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain],
    );
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Primary Niche */}
      <Card className="bg-card/60 border-border/80">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Radar Focus & Niche</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Defines the primary domain your opportunity matching engine prioritizes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="niche" className="text-xs">Primary Niche</Label>
            <Input
              id="niche"
              name="niche"
              defaultValue={initialData.niche ?? ""}
              placeholder="e.g. Product design for early-stage Web3 protocols"
              className="h-9 text-xs bg-secondary/50 border-border"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skills" className="text-xs">Core Skills (comma separated)</Label>
            <Input
              id="skills"
              name="skills"
              defaultValue={initialData.skills.join(", ")}
              placeholder="e.g. Solidity, React, Tailwind, Next.js, Figma, ZK"
              className="h-9 text-xs bg-secondary/50 border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Target Roles */}
      <Card className="bg-card/60 border-border/80">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Target Roles</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Select the types of work you are looking to take on.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {availableRoles.map((role) => {
              const checked = selectedRoles.includes(role);
              return (
                <label
                  key={role}
                  className={`flex items-center gap-2.5 rounded-md border p-2.5 text-xs cursor-pointer transition-colors ${
                    checked
                      ? "border-primary/50 bg-primary/10 text-primary font-medium"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleRole(role)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <span>{role}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Target Chains */}
      <Card className="bg-card/60 border-border/80">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Target Ecosystems & Chains</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Ecosystems to prioritize in discovery score calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {availableChains.map((chain) => {
              const checked = selectedChains.includes(chain);
              return (
                <label
                  key={chain}
                  className={`flex items-center gap-2.5 rounded-md border p-2.5 text-xs cursor-pointer transition-colors ${
                    checked
                      ? "border-primary/50 bg-primary/10 text-primary font-medium"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleChain(chain)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <span>{chain}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CV & Links */}
      <Card className="bg-card/60 border-border/80">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Experience & Links</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Summary text used to match relevant technical keywords and past project experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="portfolioUrl" className="text-xs">Portfolio / Website URL</Label>
              <Input
                id="portfolioUrl"
                name="portfolioUrl"
                type="url"
                defaultValue={initialData.portfolioUrl ?? ""}
                placeholder="https://..."
                className="h-9 text-xs bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="githubUrl" className="text-xs">GitHub Profile URL</Label>
              <Input
                id="githubUrl"
                name="githubUrl"
                type="url"
                defaultValue={initialData.githubUrl ?? ""}
                placeholder="https://github.com/..."
                className="h-9 text-xs bg-secondary/50 border-border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cvText" className="text-xs">Experience Summary or CV Extract</Label>
            <Textarea
              id="cvText"
              name="cvText"
              rows={5}
              defaultValue={initialData.cvText ?? ""}
              placeholder="Paste services offered, past protocols built for, or resume extract..."
              className="text-xs bg-secondary/50 border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-2">
        {savedSuccess ? (
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <Check className="size-3.5" />
            <span>Preferences saved successfully! Matches updated.</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Changes immediately update your feed ranking scores.
          </span>
        )}

        <Button type="submit" disabled={isPending} className="gap-1.5 font-mono text-xs">
          <Save className="size-3.5" />
          <span>{isPending ? "Saving..." : "Save Preferences"}</span>
        </Button>
      </div>
    </form>
  );
}

