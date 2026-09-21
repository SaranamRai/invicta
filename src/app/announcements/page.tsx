"use client";

import { useEffect, useState } from "react";
import { Download, Megaphone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getPublicAnnouncements, mapMongoAnnouncement } from "@/lib/api";
import { NotificationData } from "@/lib/types";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<NotificationData[]>([]);

  const downloadAttachment = (announcement: NotificationData) => {
    if (!announcement.attachmentHtml) return;

    const blob = new Blob([announcement.attachmentHtml], {
      type: announcement.attachmentType || "application/msword",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = announcement.attachmentName || "invicta-announcement.doc";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadAnnouncements() {
      const publicAnnouncements = await getPublicAnnouncements();
      if (!isMounted) return;
      setAnnouncements(publicAnnouncements.map(mapMongoAnnouncement));
    }

    void loadAnnouncements();
    const interval = window.setInterval(loadAnnouncements, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-8">
        <h1 className="sport-heading text-5xl font-black tracking-tighter text-primary">Announcements</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
          Official event notices, fixture updates, delays, and important messages for MSU Invicta.
        </p>
      </header>

      <div className="grid gap-4">
        {announcements.length > 0 ? announcements.map((announcement) => (
          <Card key={announcement.id} className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">{announcement.type}</p>
            <h2 className="mt-2 text-xl font-black text-foreground">{announcement.title}</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{announcement.message}</p>
            {announcement.attachmentHtml && (
              <button
                type="button"
                onClick={() => downloadAttachment(announcement)}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.02]"
              >
                <Download size={16} />
                Download Flowchart
              </button>
            )}
          </Card>
        )) : (
          <div className="rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
            <Megaphone size={44} className="mx-auto text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">No announcements posted yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
