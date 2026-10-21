"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, ArrowRight, Sparkles } from "lucide-react";
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

      // Restrict website login to Admin and Teacher only
      if (user && user.role !== "admin" && user.role !== "teacher") {
        setError(
          "Access denied. Only Admin and Teacher accounts are permitted to access the web portal."
        );
        return;
      }

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-indigo-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-violet-200/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-white items-center justify-center shadow-lg shadow-indigo-500/10 border border-slate-200/80 mb-4 p-2.5">
            <Image
              src="/RUPP.jpg"
              alt="RUPP Logo"
              width={80}
              height={80}
              className="w-full h-full object-contain rounded-xl"
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ATTENDANCE SYSTEM
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Royal University of Phnom Penh
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
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
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Quick Login (Authorized Roles):</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => quickFill("admin@attendance.com")}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-left transition-colors cursor-pointer group"
              >
                <div className="font-semibold text-rose-700 group-hover:text-rose-800">Admin</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">admin@attendance.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("teacher@attendance.com")}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-left transition-colors cursor-pointer group"
              >
                <div className="font-semibold text-indigo-700 group-hover:text-indigo-800">Teacher</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">teacher@attendance.com</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Default password for demo accounts:{" "}
          <code className="text-indigo-600 font-mono">password123</code>
        </p>
      </div>
    </div>
  );
}
