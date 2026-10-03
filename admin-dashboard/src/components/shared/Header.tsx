"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/api-client";
import { User } from "@/types";

export const Header: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("attendance_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Continue cleanup even if server call fails
    } finally {
      localStorage.removeItem("attendance_token");
      localStorage.removeItem("attendance_user");
      // clear cookie
      document.cookie =
        "attendance_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      router.push("/login");
    }
  };

  return (
    <header className="h-18 px-8 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Institution Attendance Management
        </h2>
        <p className="text-xs text-slate-500">
          Academic Year 2025/2026 • Real-Time Monitoring
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <UserIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900">
              {user?.name || "Administrator"}
            </p>
            <p className="text-[10px] text-indigo-600 font-semibold">
              {user?.role?.toUpperCase() || "ADMIN"}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 ml-1"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
