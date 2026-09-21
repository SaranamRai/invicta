"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { MatchData } from "@/lib/types";
import { createLiveFeedPost, getAssignedMatches, uploadFeedImage } from "@/lib/services/mongo-service";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Loader2, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function VolunteerFeedClient() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      const matchesData = await getAssignedMatches();
      if (!isMounted) return;
      setMatches(matchesData.filter((match) => match.status === "Live" || match.status === "Upcoming"));
    }

    void loadMatches();
    const interval = window.setInterval(loadMatches, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMatch || !content.trim()) {
      showMessage("Please select a match and write some content.", "error");
      return;
    }

    setSaving(true);
    try {
      const matchDetails = matches.find((match) => match.id === selectedMatch);
      const matchTitle = matchDetails ? `${matchDetails.teamA} vs ${matchDetails.teamB}` : "Match Update";
      const email = auth.currentUser?.email || "volunteer@gmail.com";
      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadFeedImage(imageFile);
      }

      await createLiveFeedPost(selectedMatch, matchTitle, content, email, imageUrl);
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      showMessage("Live feed published successfully!", "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to publish feed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h1 className="sport-heading text-4xl font-black uppercase tracking-tighter text-white">Live Feed Publisher</h1>
        <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-400">
          Post global updates, photos, and commentary for the fans
        </p>
      </div>

      {message.text && (
        <div
          className={cn(
            "animate-in fade-in slide-in-from-top-4 rounded-xl p-4 text-center text-xs font-black uppercase tracking-widest",
            message.type === "success"
              ? "border border-accent/20 bg-accent/20 text-accent"
              : "border border-red-500/20 bg-red-500/20 text-red-400"
          )}
        >
          {message.text}
        </div>
      )}

      <Card className="border-white/10 bg-white/5 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Match context</label>
            <select
              value={selectedMatch}
              onChange={(event) => setSelectedMatch(event.target.value)}
              className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-sm font-bold tracking-tight text-white focus:border-accent focus:outline-none"
            >
              <option value="" disabled>-- Select a Match --</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.teamA} vs {match.teamB} ({match.sport})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Feed Content</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="What's happening? (e.g. Incredible save by the goalkeeper!)"
              className="h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-medium text-white focus:border-accent focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attach Media (Optional)</label>
            {imagePreview ? (
              <div className="relative h-48 w-48 overflow-hidden rounded-xl border border-white/10">
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10">
                  <ImageIcon size={18} className="text-accent" />
                  Select Image
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <button
              type="submit"
              disabled={saving || !selectedMatch || !content.trim()}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              Publish to Global Feed
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
