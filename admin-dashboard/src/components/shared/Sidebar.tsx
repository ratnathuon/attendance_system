"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  Settings,
  PlusCircle,
  CheckSquare,
  QrCode,
  Radio,
  FileDown,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavigationItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Users Directory", href: "/users", icon: Users },
  { name: "Classes & Mazers", href: "/classes", icon: GraduationCap },
  { name: "Subjects & Teachers", href: "/subjects", icon: BookOpen },
  { name: "Leave Requests", href: "/leaves", icon: CheckSquare },
  { name: "Announcements", href: "/announcements", icon: Megaphone },
  { name: "System Reports", href: "/reports", icon: BarChart3 },
  { name: "System Settings", href: "/settings", icon: Settings },
];

const teacherNavigationItems = [
  { name: "Dashboard & Sessions", href: "/", icon: LayoutDashboard },
  { name: "Start Live Session", href: "/teacher/new-session", icon: PlusCircle },
  { name: "Announcements", href: "/teacher/announcements", icon: Megaphone },
  { name: "Subject PDF Reports", href: "/teacher/reports", icon: FileDown },
  { name: "Leave Requests", href: "/teacher/leave-requests", icon: CheckSquare },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>("admin");

  useEffect(() => {
    const stored = localStorage.getItem("attendance_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role) setUserRole(u.role);
      } catch {
        // ignore
      }
    }
  }, []);

  const items = userRole === "teacher" ? teacherNavigationItems : adminNavigationItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen shadow-xs">
      {/* Brand Header */}
      <div className="h-20 px-4 flex items-center gap-3 border-b border-slate-200">
        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-xs border border-slate-200 p-1 shrink-0">
          <Image
            src="/RUPP.jpg"
            alt="RUPP Logo"
            width={44}
            height={44}
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight text-xs">
              ATTENDANCE SYSTEM
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 line-clamp-1">
            Royal University of Phnom Penh
          </p>
          <div className="mt-1">
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                userRole === "teacher"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {userRole === "teacher" ? "Faculty Portal" : "Admin Console"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {userRole === "teacher" ? "Teacher Menu" : "Main Menu"}
        </div>
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span>{item.name}</span>
              {isActive && (
                <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-700 font-medium">Core API</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono font-medium">
            Connected
          </span>
        </div>
      </div>
    </aside>
  );
};
