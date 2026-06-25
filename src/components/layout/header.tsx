"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { InvictaLogo } from "@/components/invicta-logo";
import { MedhaviLogo } from "@/components/medhavi-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPublicAnnouncements, mapMongoAnnouncement } from "@/lib/api";
import { NotificationData } from "@/lib/types";

interface GuestNotification extends NotificationData {
  href?: string;
}

export function Header() {
  const [notifications, setNotifications] = useState<GuestNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isPublicDashboard = pathname === "/public-dashboard";

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
    <header className="sticky top-0 z-30 hidden min-h-16 w-full items-center justify-between gap-3 border-b border-border bg-background/90 px-6 py-3 backdrop-blur-xl lg:flex lg:h-20 lg:px-8 lg:py-0">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {isPublicDashboard ? (
          <Link href="/" aria-label="Medhavi Skills University home">
            <MedhaviLogo className="h-12 w-44 sm:h-14 sm:w-56" />
          </Link>
        ) : (
          <Link href="/public-dashboard" aria-label="Invicta home">
            <InvictaLogo className="h-12 w-44 sm:h-14 sm:w-56" />
          </Link>
        )}
      </div>





      <div className="flex items-center gap-4">
        <ThemeToggle />

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-card transition-all hover:border-accent hover:text-accent group"
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
    </header>
  );
}
