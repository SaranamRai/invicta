"use client";

import { Bell, BookOpen, Calendar, HelpCircle, Megaphone, Radio, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { getPublicAnnouncements, mapMongoAnnouncement } from "@/lib/api";
import { NotificationData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GuestNotification extends NotificationData {
  href?: string;
}

const publicNavItems = [
  { icon: Trophy, label: "Standings", href: "/standings" },
  { icon: Calendar, label: "Matches", href: "/matches" },
  { icon: Target, label: "Sports", href: "/sports" },
  { icon: Radio, label: "Results", href: "/results" },
  { icon: Megaphone, label: "News", href: "/announcements" },
  { icon: BookOpen, label: "Rules", href: "/rules" },
  { icon: HelpCircle, label: "Help", href: "/contact" },
];

export function Header() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<GuestNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      const announcements = await getPublicAnnouncements();
      if (!isMounted) return;
      setNotifications(announcements.map(mapMongoAnnouncement).slice(0, 5));
    }

    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 hidden w-full border-b border-border bg-background/88 px-6 py-3 shadow-sm shadow-slate-950/5 backdrop-blur-xl lg:block lg:px-8">
      <div className="flex min-h-16 items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/public-dashboard"
            className={cn(
              "group inline-flex h-11 items-center rounded-full border px-4 text-[11px] font-black uppercase tracking-[0.18em] transition-all",
              pathname === "/public-dashboard"
                ? "border-accent bg-accent text-accent-foreground shadow-lg shadow-accent/20"
                : "border-border bg-card text-foreground hover:border-accent hover:text-accent"
            )}
          >
            Dashboard
          </Link>
          <nav className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-border bg-card/80 p-1">
            {publicNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/matches" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.12em] transition-all xl:px-4",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon size={14} className={cn(isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-all hover:border-accent hover:text-accent"
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent animate-pulse" />}
            </button>

            {isOpen && (
              <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Event Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.href || "/matches"}
                      onClick={() => setIsOpen(false)}
                      className="block border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-secondary"
                    >
                      <p className="text-sm font-black text-foreground">{notification.title}</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">{notification.message}</p>
                    </Link>
                  )) : (
                    <div className="px-5 py-8 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </header>
  );
}
