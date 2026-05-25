"use client";

import React, { useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

import Link from "next/link";
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

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google.");
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-2">Medhavi Skills University • Official Portal</p>
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
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Official Email Address</label>
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

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black text-slate-300">
              <span className="bg-white px-6">Secure Override</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-16 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-4 group disabled:opacity-50 text-slate-700 shadow-sm"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.67 1.77L20.13 3.4C17.91 1.3 15.14 0 12 0 7.35 0 3.37 2.67 1.4 6.6l4.23 3.28C6.6 6.64 9.11 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.56-.19-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58l3.89 3.02c2.27-2.1 3.53-5.2 3.53-8.84z" />
              <path fill="#34A853" d="M5.63 14.88c-.24-.72-.38-1.48-.38-2.28s.14-1.56.38-2.28L1.4 6.6C.51 8.38 0 10.36 0 12.4s.51 4.02 1.4 5.8l4.23-3.32z" />
              <path fill="#FBBC05" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.02c-1.08.73-2.47 1.16-4.04 1.16-3.11 0-5.74-2.1-6.68-4.92l-4.23 3.32C3.37 21.33 7.35 24 12 24z" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              New to the League?{" "}
              <Link href="/register" className="text-accent hover:underline ml-2">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
