"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Megaphone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { NotificationData } from "@/lib/types";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<NotificationData[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "notifications"), orderBy("timestamp", "desc")), (snapshot) => {
      setAnnouncements(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NotificationData)));
    });

    return () => unsubscribe();
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
