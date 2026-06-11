"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { useRouter } from "next/navigation";
import { loginRoleAccount } from "@/lib/api";
import { roleHomePath, storePortalSession } from "@/lib/role-auth";
<<<<<<< HEAD
=======
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)

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
    const portalEmail = cleanEmail.toLowerCase();

    try {
      if (!cleanEmail || !cleanPassword) {
        setError("Please enter your email and password.");
        return;
      }

      const session = await loginRoleAccount(portalEmail, cleanPassword);
      storePortalSession(session);
      router.push(roleHomePath[session.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setPassword("");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-3xl"
      >
<<<<<<< HEAD
        <div className="mb-8 sm:mb-10">
          <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
            <div className="flex h-16 w-40 shrink-0 items-center justify-start overflow-hidden sm:h-20 sm:w-44">
              <img
                src="/msu-logo-transparent.png"
                alt="Medhavi Skills University"
                className="h-auto w-full object-contain"
              />
            </div>
            <span className="hidden h-14 w-px shrink-0 bg-slate-300 sm:block" aria-hidden="true" />
            <div className="flex w-full min-w-0 flex-1 items-center justify-center gap-3 sm:gap-5">
              <span className="h-[1.5px] w-16 bg-accent sm:w-20" />
              <span className="text-[22px] font-bold uppercase tracking-[0.42em] text-slate-900 font-serif italic sm:text-[28px] sm:tracking-[0.6em]">Invicta</span>
              <span className="h-[1.5px] w-16 bg-accent sm:w-20" />
            </div>
=======
        <div className="mb-5 sm:mb-7">
          <div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
            <InvictaLogo className="h-20 w-72 sm:h-24 sm:w-96" />
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
          </div>
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:tracking-[0.2em]">Admin, Volunteer & Coordinator Login</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/75 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-2xl sm:rounded-[2.5rem] sm:p-10">
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

          <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Admin, Volunteer, or Coordinator Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  name="portal-email"
                  autoComplete="username email"
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
                  name="portal-password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
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
                  Sign In
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
