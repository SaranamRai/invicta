"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RegisterPageContent } from "../register/page";

export default function PublicRegisterPage() {
  const [open, setOpen] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ref = doc(db, "meta", "registration");
    const unsub = onSnapshot(ref, (snap) => {
      setLoaded(true);
      if (!snap.exists()) {
        setOpen(false);
        setEndAt(null);
        return;
      }
      const data = snap.data();
      const rawEnd = data.endAt;
      let millis: number | null = null;
      if (rawEnd && typeof (rawEnd as any).toMillis === "function") millis = (rawEnd as any).toMillis();
      else if (typeof rawEnd === "number") millis = rawEnd;
      else if (rawEnd && (rawEnd as any).seconds) millis = (rawEnd as any).seconds * 1000;

      setEndAt(millis);
      setOpen(Boolean(data.open));
    });

    return () => unsub();
  }, []);

  const now = Date.now();
  const expired = endAt ? now > endAt : false;
  const allow = open && !expired;

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-sm font-black uppercase">Checking registration status...</div>
      </div>
    );
  }

  if (!allow) {
    return (
      <div className="min-h-screen bg-white px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10 text-center">
            <h1 className="text-3xl font-black">Public Registration is Closed</h1>
            <p className="mt-4 text-sm text-slate-600">The public registration portal is currently closed. It will open when the organiser (super-coordinator) enables it and before the registration deadline.</p>
            {endAt && (
              <p className="mt-4 text-xs font-bold text-slate-500">Registration deadline: {new Date(endAt).toLocaleString()}</p>
            )}
            <div className="mt-6 flex justify-center gap-4">
              <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-black">Back to Home</Link>
              <Link href="/login" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Staff Login</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <RegisterPageContent />;
}
