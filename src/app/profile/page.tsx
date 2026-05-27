"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Camera, CheckCircle2, Clock3, Mail, Shield, Upload, User, XCircle } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { Card } from "@/components/ui/card";
import { auth, db, storage } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

type UserProfile = {
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  createdAt?: string | null;
  photoURL?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function ProfilePage() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user) {
        setIsLoading(false);
        setProfile(null);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (!isMounted) return;

        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load profile details.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const displayName = profile?.fullName || user?.displayName || "Invicta Member";
  const email = profile?.email || user?.email || "No email available";
  const role = profile?.role || "user";
  const joinedDate = profile?.createdAt || user?.metadata.creationTime;
  const photoURL = profile?.photoURL || user?.photoURL;
  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "IM";
  }, [displayName]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");
    setUploadMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Profile image must be smaller than 3 MB.");
      return;
    }

    setIsUploading(true);

    try {
      const fileExtension = file.name.split(".").pop() || "jpg";
      const imageRef = ref(storage, `profiles/${user.uid}/avatar.${fileExtension}`);
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);

      await updateProfile(user, { photoURL: imageUrl });
      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: displayName,
          email,
          role,
          photoURL: imageUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setProfile((current) => ({ ...current, photoURL: imageUrl }));
      setUploadMessage("Profile image updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload profile image.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (!user) {
    return (
      <div className="space-y-10">
        <header className="border-b border-border pb-8">
          <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">My Profile</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Profile details are available after volunteer login
          </p>
        </header>
        <Card className="border-2 p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary text-primary">
            <User size={34} />
          </div>
          <h2 className="mt-6 text-2xl font-black sport-heading">No Active Profile</h2>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Public users can browse the site without creating an account.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">My Profile</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Account identity and arena access details
          </p>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-8 lg:grid-cols-[1fr_1.4fr]"
      >
        <Card className="relative overflow-hidden border-2 p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-[70px]" />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-accent bg-accent/10 text-4xl font-black text-accent sport-heading shadow-2xl shadow-accent/10">
              {photoURL ? (
                <img src={photoURL} alt={`${displayName} profile`} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all hover:border-accent hover:text-accent">
              {isUploading ? <Clock3 className="animate-spin" size={16} /> : <Camera size={16} />}
              {isUploading ? "Uploading" : "Add Image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={isUploading}
                onChange={handleImageUpload}
              />
            </label>
            {uploadMessage && (
              <p className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                <Upload size={14} />
                {uploadMessage}
              </p>
            )}
            <h2 className="mt-6 text-3xl font-black sport-heading">{displayName}</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{email}</p>
            <span className="mt-6 rounded-xl bg-primary px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground">
              {role} Access
            </span>
          </div>
        </Card>

        <Card className="border-2 p-0">
          <div className="border-b border-border px-8 py-6">
            <h3 className="text-2xl font-black sport-heading">Profile Details</h3>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 px-8 py-10 text-xs font-black uppercase tracking-widest text-muted-foreground">
              <Clock3 className="animate-spin text-accent" size={20} />
              Loading profile
            </div>
          ) : error ? (
            <div className="px-8 py-10 text-xs font-black uppercase tracking-widest text-rose-500">
              {error}
            </div>
          ) : (
            <div className="grid gap-0 divide-y divide-border">
              <ProfileRow icon={User} label="Full Name" value={displayName} />
              <ProfileRow icon={Mail} label="Email Address" value={email} />
              <ProfileRow icon={Shield} label="Role" value={role} />
              <ProfileRow icon={Calendar} label="Joined" value={formatDate(joinedDate)} />
              <ProfileRow
                icon={user?.emailVerified ? CheckCircle2 : XCircle}
                label="Email Status"
                value={user?.emailVerified ? "Verified" : "Not verified"}
              />
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      </div>
      <span className="break-all text-sm font-black uppercase tracking-wider">{value}</span>
    </div>
  );
}
