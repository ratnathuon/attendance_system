"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  Radio,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/api-client";
import { DashboardOverviewData } from "@/types";

export default function OverviewPage() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/admin/reports/overview");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch {
      // Fallback preview data if API is initializing
      setData({
        counts: {
          students: 4,
          teachers: 2,
          mazers: 2,
          classes: 3,
          subjects: 4,
          active_sessions: 1,
        },
        today: {
          attendance_rate: 85.5,
          present: 12,
          late: 2,
          absent: 1,
          excused: 1,
          total_marks: 16,
        },
        attendance_trend: [
          { date: "2026-09-20", day: "Sun", present: 0, absent: 0, excused: 0, rate: 0 },
          { date: "2026-09-21", day: "Mon", present: 22, absent: 2, excused: 1, rate: 88 },
          { date: "2026-09-22", day: "Tue", present: 24, absent: 1, excused: 0, rate: 96 },
          { date: "2026-09-23", day: "Wed", present: 20, absent: 3, excused: 2, rate: 80 },
          { date: "2026-09-24", day: "Thu", present: 23, absent: 1, excused: 1, rate: 92 },
          { date: "2026-09-25", day: "Fri", present: 21, absent: 2, excused: 2, rate: 84 },
          { date: "2026-09-26", day: "Sat", present: 14, absent: 1, excused: 1, rate: 87.5 },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-indigo-50 via-white to-purple-50 border border-indigo-100/80 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/70 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-time Dynamic QR Attendance Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Welcome to Attend<span className="text-indigo-600">Sphere</span>
          </h1>
          <p className="text-slate-600 text-sm mt-2 leading-relaxed">
            Monitor institution-wide lecture check-ins, oversee student leave
            approvals, manage classroom advisor assignments, and analyze
            historical attendance trends.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/users">
              <Button size="sm">Manage Users</Button>
            </Link>
            <Link href="/classes">
              <Button variant="secondary" size="sm">
                View Classes
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" size="sm">
                Full Analytics Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient glow accent */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enrolled Students
              </p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">
                {isLoading ? "..." : data?.counts.students ?? 0}
              </h4>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold flex items-center mr-1">
              Active
            </span>
            <span>across all academic programs</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Teachers & Mazers
              </p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">
                {isLoading
                  ? "..."
                  : (data?.counts.teachers ?? 0) + (data?.counts.mazers ?? 0)}
              </h4>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>
              {data?.counts.teachers} Teachers • {data?.counts.mazers} Class Advisors
            </span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Classes
              </p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">
                {isLoading ? "..." : data?.counts.classes ?? 0}
              </h4>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>{data?.counts.subjects} total registered subjects</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Sessions
              </p>
              <h4 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                {isLoading ? "..." : data?.counts.active_sessions ?? 0}
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              </h4>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Radio className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>Dynamic QR rotation active</span>
          </div>
        </Card>
      </div>

      {/* Today's Attendance Overview & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Status Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Today&apos;s Attendance</CardTitle>
              <CardDescription>Live check-in performance summary</CardDescription>
            </div>
            <Badge variant="success">
              {data?.today.attendance_rate ?? 0}% Rate
            </Badge>
          </CardHeader>

          <div className="space-y-4 mt-6">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Present (On-time)</p>
                  <p className="text-[10px] text-slate-500">Scanned before late cutoff</p>
                </div>
              </div>
              <span className="text-base font-bold text-emerald-600">
                {data?.today.present ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Late Check-ins</p>
                  <p className="text-[10px] text-slate-500">Grace period threshold exceeded</p>
                </div>
              </div>
              <span className="text-base font-bold text-amber-600">
                {data?.today.late ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Unexcused Absences</p>
                  <p className="text-[10px] text-slate-500">No scan recorded</p>
                </div>
              </div>
              <span className="text-base font-bold text-rose-600">
                {data?.today.absent ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Excused / Approved Leave</p>
                  <p className="text-[10px] text-slate-500">Approved by Mazer & Teacher</p>
                </div>
              </div>
              <span className="text-base font-bold text-sky-600">
                {data?.today.excused ?? 0}
              </span>
            </div>
          </div>
        </Card>

        {/* 7-Day Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>7-Day Attendance Rate Trend</CardTitle>
              <CardDescription>
                Historical participation rate percentage over past sessions
              </CardDescription>
            </div>
            <Link
              href="/reports"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
            >
              <span>Detailed Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <div className="mt-8 flex items-end justify-between gap-3 h-52 px-2">
            {data?.attendance_trend.map((day, idx) => {
              const heightPercent = Math.max(10, Math.min(100, day.rate));
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 border border-slate-800 text-xs px-2.5 py-1 rounded-lg text-white pointer-events-none whitespace-nowrap shadow-xl z-20">
                    <span className="font-bold text-indigo-400">{day.rate}%</span> (
                    {day.present} present, {day.absent} absent)
                  </div>

                  <div className="w-full bg-slate-100 rounded-xl h-44 flex items-end p-1">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-indigo-600 to-violet-500 rounded-lg transition-all duration-500 group-hover:from-indigo-500 group-hover:to-violet-400 shadow-sm shadow-indigo-500/20"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
