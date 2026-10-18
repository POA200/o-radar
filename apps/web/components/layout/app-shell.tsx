"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Briefcase,
  Bookmark,
  Settings,
  Radar,
  LogOut,
  Menu,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { handleSignOut } from "@/app/actions";

export interface AppUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  niche?: string | null;
}

interface AppShellProps {
  user: AppUser;
  lastSyncTime?: Date | string | null;
  activeLeadsCount?: number;
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/leads", label: "My Leads", icon: Briefcase },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

function formatTimeAgo(timestamp?: Date | string | null) {
  if (!timestamp) return "Never synced";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Never synced";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `Synced ${minutes}m ago`;
  if (minutes < 1440) return `Synced ${Math.round(minutes / 60)}h ago`;
  return `Synced ${Math.round(minutes / 1440)}d ago`;
}

export function AppShell({ user, lastSyncTime, activeLeadsCount, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const syncLabel = formatTimeAgo(lastSyncTime);
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? "U";

  const renderNavLinks = () => (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary pl-2.5"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/leads" && typeof activeLeadsCount === "number" && activeLeadsCount > 0 && (
              <span className="grid size-5 place-items-center rounded bg-secondary font-mono text-[10px] text-muted-foreground">
                {activeLeadsCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/80 bg-card/50 backdrop-blur-md">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border/80 px-5">
          <div className="grid size-7 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary shadow-xs">
            <Radar className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-foreground">O-Radar</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Web3 Intelligence</span>
          </div>
        </div>

        {/* Navigation */}
        {renderNavLinks()}

        {/* Freshness & System Sync indicator */}
        <div className="border-t border-border/60 p-4">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 py-2">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <Activity className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] text-muted-foreground truncate">{syncLabel}</span>
          </div>
        </div>

        {/* User Card */}
        <div className="border-t border-border/80 p-3">
          <div className="flex items-center justify-between rounded-md p-2 hover:bg-secondary/40 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="size-8 border border-border/80">
                {user.image && <AvatarImage src={user.image} alt={user.name ?? "User"} />}
                <AvatarFallback className="bg-secondary text-xs text-foreground font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{user.name || "Builder"}</p>
                <p className="truncate text-[10px] text-muted-foreground">{user.email || ""}</p>
              </div>
            </div>
            <form action={handleSignOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="size-3.5" />
                <span className="sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Topbar */}
        <header className="flex h-14 items-center justify-between border-b border-border/80 bg-card/60 px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded border border-primary/40 bg-primary/10 text-primary">
              <Radar className="size-3.5" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">O-Radar</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground mr-1">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>{syncLabel}</span>
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Open navigation menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card">
                <SheetHeader className="h-16 border-b border-border/80 px-5 flex flex-row items-center gap-2.5">
                  <div className="grid size-7 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                    <Radar className="size-4" />
                  </div>
                  <SheetTitle className="font-semibold text-sm text-foreground">O-Radar</SheetTitle>
                </SheetHeader>

                {renderNavLinks()}

                <div className="border-t border-border/80 p-4 mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-8 border border-border">
                        {user.image && <AvatarImage src={user.image} alt={user.name ?? "User"} />}
                        <AvatarFallback className="bg-secondary text-xs text-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{user.name || "Builder"}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{user.email || ""}</p>
                      </div>
                    </div>
                    <form action={handleSignOut}>
                      <Button type="submit" variant="ghost" size="icon-xs" title="Sign out">
                        <LogOut className="size-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </form>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

