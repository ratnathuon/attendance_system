"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
        device_name: "admin-web-dashboard",
      });

      const { token, user } = response.data;

      // Store token & user
      localStorage.setItem("attendance_token", token);
      localStorage.setItem("attendance_user", JSON.stringify(user));

      // Set cookie for middleware
      document.cookie = `attendance_token=${token}; path=/; max-age=86400; SameSite=Lax`;

      router.push("/");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Invalid email or password. Please verify your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#090d16]">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 items-center justify-center shadow-xl shadow-indigo-500/25 border border-indigo-400/30 mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Attend<span className="text-indigo-400">Sphere</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Smart Attendance & QR Verification
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-2xl p-8 shadow-2xl glow-card">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="relative">
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@attendance.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Demo Credentials Quick Fill */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick Login (Demo Accounts):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("admin@attendance.com")}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-rose-400">Admin</div>
                <div className="text-[10px] text-slate-400 truncate">admin@attendance.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("teacher@attendance.com")}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-indigo-400">Teacher</div>
                <div className="text-[10px] text-slate-400 truncate">teacher@attendance.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("mazer@attendance.com")}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-amber-400">Mazer (Advisor)</div>
                <div className="text-[10px] text-slate-400 truncate">mazer@attendance.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("student@attendance.com")}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-emerald-400">Student</div>
                <div className="text-[10px] text-slate-400 truncate">student@attendance.com</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Default password for all demo accounts:{" "}
          <code className="text-indigo-400 font-mono">password123</code>
        </p>
      </div>
    </div>
  );
}
