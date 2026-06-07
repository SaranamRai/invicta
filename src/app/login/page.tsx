"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { useRouter } from "next/navigation";
import { loginRoleAccount } from "@/lib/api";
import { roleHomePath, storePortalSession } from "@/lib/role-auth";

const demoAccounts = [
  {
    label: "Supercoordinator",
    email: "supercoordinator@gmail.com",
    password: "1234",
    note: "Create tournaments, fixtures, teams, and sport accounts.",
  },
  {
    label: "Football Coordinator",
    email: "coordinatorfootball@gmail.com",
    password: "1234",
    note: "Manage football teams, volunteers, rules, and match duties.",
  },
  {
    label: "Football Volunteer",
    email: "volunteerfootball@gmail.com",
    password: "1234",
    note: "Update assigned football matches and live feed posts.",
  },
  {
    label: "Admin",
    email: "admin@gmail.com",
    password: "1234",
    note: "View system users, permissions, fixtures, and tournament data.",
  },
];

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

  const fillDemoAccount = (account: typeof demoAccounts[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-6 sm:py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="mb-5 sm:mb-7">
          <div className="mb-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
            <div className="flex h-16 w-40 shrink-0 items-center justify-start overflow-hidden sm:h-20 sm:w-44">
              <img
                src="/msu-logo-transparent.png"
                alt="Medhavi Skills University"
                className="h-auto w-full object-contain"
              />
            </div>
            <span className="hidden h-14 w-px shrink-0 bg-slate-300 sm:block" aria-hidden="true" />
            <div className="flex w-full min-w-0 flex-1 items-center justify-center gap-3 sm:gap-5">
              <span className="h-[1.5px] w-10 bg-accent sm:w-20" />
              <span className="text-[22px] font-bold uppercase tracking-[0.2em] text-slate-900 font-serif italic sm:text-[28px]">Invicta</span>
              <span className="h-[1.5px] w-10 bg-accent sm:w-20" />
            </div>
          </div>
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">Choose a role and open the right dashboard</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.25fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Quick Role Login</h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Tap a role to fill the email and password.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemoAccount(account)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-all hover:border-accent hover:bg-accent/10"
                >
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-900">{account.label}</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">{account.note}</span>
                </button>
              ))}
            </div>
          </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
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

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Role Account Email Address</label>
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
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold tracking-tight text-slate-900 transition-all placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
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
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-12 text-sm font-bold tracking-tight text-slate-900 transition-all placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
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
              className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#0f172a] text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <ArrowRight size={18} className="text-accent" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-3 rounded-xl bg-slate-50 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <ShieldCheck size={16} className="text-accent" />
            Public users can browse without login
          </div>
        </div>
        </div>
      </motion.div>
    </div>
  );
}
