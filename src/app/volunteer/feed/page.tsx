"use client";

import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { MatchData } from "@/lib/types";
import { createLiveFeedPost, getAllMatches, uploadFeedImage } from "@/lib/services/mongo-service";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VolunteerLiveFeedPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      const matchesData = await getAllMatches();
      if (!isMounted) return;
      setMatches(matchesData.filter(m => m.status === "Live" || m.status === "Upcoming"));
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !content.trim()) {
      showMessage("Please select a match and write some content.", "error");
      return;
    }

    setSaving(true);
    try {
      const matchDetails = matches.find(m => m.id === selectedMatch);
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
    <div className="space-y-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase sport-heading">Live Feed Publisher</h1>
        <p className="text-slate-400 font-medium mt-2 uppercase tracking-widest text-xs">
          Post global updates, photos, and commentary for the fans
        </p>
      </div>

      {message.text && (
        <div className={cn(
          "p-4 rounded-xl text-xs font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-4",
          message.type === "success" ? "bg-accent/20 text-accent border border-accent/20" : "bg-red-500/20 text-red-400 border border-red-500/20"
        )}>
          {message.text}
        </div>
      )}

      <Card className="bg-white/5 border-white/10 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Match context</label>
            <select 
              value={selectedMatch}
              onChange={(e) => setSelectedMatch(e.target.value)}
              className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm font-bold tracking-tight focus:outline-none focus:border-accent text-white"
            >
              <option value="" disabled>-- Select a Match --</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>{m.teamA} vs {m.teamB} ({m.sport})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Feed Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening? (e.g. Incredible save by the goalkeeper!)"
              className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-accent text-white resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attach Media (Optional)</label>
            {imagePreview ? (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-white hover:text-red-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors text-sm font-bold text-white uppercase tracking-wider">
                  <ImageIcon size={18} className="text-accent" />
                  Select Image
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10">
            <button 
              type="submit"
              disabled={saving || !selectedMatch || !content.trim()}
              className="w-full h-14 bg-accent text-accent-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
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
