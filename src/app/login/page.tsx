"use client";

import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      if (cleanEmail.toLowerCase() !== "volunteer@gmail.com" || cleanPassword !== "1234") {
        setError("Only the volunteer account can access this portal.");
        return;
      }

      // Special case for dummy volunteer: Firebase requires 6 chars, so we pad it behind the scenes.
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, "123456");
      } catch (innerErr) {
        const errorCode = typeof innerErr === "object" && innerErr !== null && "code" in innerErr
          ? innerErr.code
          : null;

        if (errorCode === "auth/user-not-found" || errorCode === "auth/invalid-credential") {
          const { createUserWithEmailAndPassword } = await import("firebase/auth");
          await createUserWithEmailAndPassword(auth, cleanEmail, "123456");
        } else {
          throw innerErr;
        }
      }

      router.push("/volunteer");
    } catch (err) {
      console.error("Firebase Login Error:", err);
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="h-16 w-auto overflow-hidden flex items-center justify-center">
              <img 
                src="/msu-logo.png" 
                alt="MSU Logo" 
                className="h-full w-auto max-w-none ml-[-2px]" 
              />
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4">
                <span className="h-[1.5px] w-14 bg-accent" />
                <span className="text-[24px] font-bold tracking-[0.6em] text-slate-900 uppercase font-serif italic">Invicta</span>
                <span className="h-[1.5px] w-14 bg-accent" />
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-2">Volunteer Access Terminal</p>
        </div>

        <div className="bg-white/75 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 relative overflow-hidden">
          {/* Subtle Form Watermark */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 opacity-[0.03] blur-[20px] pointer-events-none select-none rotate-12">
            <img 
              src="/msu-logo.png" 
              alt="" 
              className="w-full h-full object-contain" 
            />
          </div>

          {error && (

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Volunteer Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu" 
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-12 text-sm font-bold tracking-tight focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" 
                  className="w-full h-14 bg-slate-50/50 border border-slate-200 rounded-2xl px-12 text-sm font-bold tracking-tight focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all text-slate-900 placeholder:text-slate-400"
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-accent transition-all duration-300 focus:outline-none bg-transparent p-1 rounded-lg hover:bg-slate-100/50"
                  >
                    {showPassword ? <Eye size={20} strokeWidth={2.5} /> : <EyeOff size={20} strokeWidth={2.5} />}
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-[#0f172a] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <ArrowRight size={18} className="text-accent" />
                  Access Terminal
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <ShieldCheck size={16} className="text-accent" />
            Public users can browse without login
          </div>
        </div>
      </motion.div>
    </div>
  );
}
