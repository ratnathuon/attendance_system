"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  PlusCircle,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  FileText,
  RotateCw,
  FileDown,
  Megaphone,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import apiClient from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { User } from "@/types";

export const TeacherDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [taughtSubjects, setTaughtSubjects] = useState<any[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const stored = localStorage.getItem("attendance_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current teacher context & taught subjects
      const meRes = await apiClient.get("/auth/me");
      if (meRes.data?.success) {
        setTaughtSubjects(meRes.data.meta?.taught_subjects || []);
      }

      // 2. Fetch teacher sessions
      const sessRes = await apiClient.get("/teacher/sessions");
      if (sessRes.data?.success) {
        setSessions(sessRes.data.data?.data || []);
      }

      // 3. Fetch leave requests count
      try {
        const reqRes = await apiClient.get("/teacher/leave-requests");
        if (reqRes.data?.success) {
          const list = reqRes.data.data?.data || [];
          setPendingRequestsCount(list.filter((r: any) => String(r.status || "").includes("pending")).length);
        }
      } catch {
        // ignore
      }
    } catch {
      // Fallback mock data if API is initializing
      setTaughtSubjects([
        {
          id: 1,
          class_room: { id: 1, name: "Year 3 - Computer Science (Class A)", code: "CS-Y3A" },
          subject: { id: 1, name: "Data Structures & Algorithms", code: "CS301" },
        },
        {
          id: 2,
          class_room: { id: 2, name: "Year 3 - Information Technology", code: "IT-Y3B" },
          subject: { id: 2, name: "Web Application Development", code: "IT302" },
        },
      ]);
      setSessions([
        {
          id: 101,
          title: "Lecture 8: Graph Algorithms & Dynamic Programming",
          status: "active",
          created_at: "2026-10-21 08:30",
          class_subject: {
            class_room: { name: "Year 3 - Computer Science (Class A)" },
            subject: { name: "Data Structures & Algorithms", code: "CS301" },
          },
          present_count: 24,
          attendance_records_count: 28,
        },
        {
          id: 98,
          title: "Lecture 7: Binary Trees and Heaps",
          status: "closed",
          created_at: "2026-10-19 14:00",
          class_subject: {
            class_room: { name: "Year 3 - Computer Science (Class A)" },
            subject: { name: "Data Structures & Algorithms", code: "CS301" },
          },
          present_count: 26,
          attendance_records_count: 28,
        },
      ]);
      setPendingRequestsCount(2);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSession = sessions.find((s) => s.status === "active");
  const activeCount = sessions.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="space-y-1 relative z-10 flex-1 min-w-0 pr-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Faculty Teacher Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome, {user?.name || "Professor"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Manage your classroom sessions, project live dynamic QR codes, and review student attendance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap relative z-10">
          <Link href="/teacher/announcements" className="shrink-0">
            <Button
              variant="outline"
              size="md"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 whitespace-nowrap shadow-xs"
            >
              <Megaphone className="w-4 h-4 mr-2 text-indigo-600" />
              <span>Broadcast Notice</span>
            </Button>
          </Link>

          <Link href="/teacher/leave-requests" className="shrink-0">
            <Button
              variant="outline"
              size="md"
              className="relative whitespace-nowrap shadow-xs"
            >
              <FileText className="w-4 h-4 mr-2 text-slate-500" />
              <span>Leave Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </Button>
          </Link>

          <Link href="/teacher/new-session" className="shrink-0">
            <Button
              size="md"
              className="shadow-md shadow-indigo-600/20 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              <span>Start Live Session</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Live Session Highlight Banner (if any) */}
      {activeSession && (
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Classroom Session Currently Live</span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white">
                {activeSession.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100 font-medium">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-300" />
                  {activeSession.class_subject?.subject?.name} (
                  {activeSession.class_subject?.subject?.code})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-300" />
                  {activeSession.class_subject?.class_room?.name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-300" />
                  Started {formatDateTime(activeSession.created_at)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0">
              <Link href={`/teacher/sessions/${activeSession.id}/qr`} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-emerald-900 hover:bg-emerald-50 font-bold shadow-lg whitespace-nowrap"
                >
                  <QrCode className="w-4 h-4 mr-2 text-emerald-700 shrink-0" />
                  <span>Open Projector Dynamic QR</span>
                </Button>
              </Link>

              <Link href={`/teacher/sessions/${activeSession.id}/attendance`} className="w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white hover:text-white border border-emerald-300/40 font-bold backdrop-blur-xs shadow-sm whitespace-nowrap"
                >
                  <ClipboardList className="w-4 h-4 mr-2 text-emerald-300 shrink-0" />
                  <span>Manual Attendance Roster</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{activeCount}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Active Live Sessions</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{sessions.length}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Total Sessions Held</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{taughtSubjects.length}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Assigned Courses</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{pendingRequestsCount}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Pending Leave Requests</div>
          </div>
        </Card>
      </div>

      {/* Assigned Classes & Subjects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              My Assigned Courses & Classes
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Click any course to launch an instant attendance session.
            </p>
          </div>
          <Link href="/teacher/new-session">
            <Button variant="ghost" size="sm" className="text-xs text-indigo-600 font-bold">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {taughtSubjects.length === 0 ? (
          <Card className="p-8 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No courses assigned yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Contact your department administrator to link courses to your teacher profile.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taughtSubjects.map((item) => (
              <Card key={item.id} className="p-5 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono border border-indigo-100">
                    {item.subject?.code || "SUBJ"}
                  </span>
                  <Link href={`/teacher/new-session`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <span>Start Session</span>
                    </Button>
                  </Link>
                </div>

                <div className="mt-3">
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                    {item.subject?.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.class_room?.name}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link href={`/teacher/new-session`} className="flex-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      <span>Start Session</span>
                    </Button>
                  </Link>

                  <Link href={`/teacher/reports`} className="flex-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full text-xs font-semibold"
                    >
                      <FileDown className="w-3.5 h-3.5 mr-1 text-slate-600" />
                      <span>Export PDF</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Attendance Sessions History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Recent Attendance Sessions
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              View records, real-time rosters, or re-open dynamic QR codes.
            </p>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No attendance sessions recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "Start Live Session" above to launch your first session.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-5">Session & Course</th>
                    <th className="py-3.5 px-5">Classroom</th>
                    <th className="py-3.5 px-5">Date / Time</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Attended</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((sess) => {
                    const isLive = sess.status === "active";
                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900 text-sm">{sess.title}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {sess.class_subject?.subject?.name} ({sess.class_subject?.subject?.code})
                          </div>
                        </td>

                        <td className="py-4 px-5 text-slate-600 font-medium">
                          {sess.class_subject?.class_room?.name || "Class"}
                        </td>

                        <td className="py-4 px-5 text-slate-500 text-[11px]">
                          {formatDateTime(sess.created_at)}
                        </td>

                        <td className="py-4 px-5">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live Active
                            </span>
                          ) : (
                            <Badge variant="neutral">Closed</Badge>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-extrabold text-slate-800">
                            {sess.present_count || 0}
                            <span className="text-slate-400 font-normal">
                              {" "}
                              / {sess.attendance_records_count || 0}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isLive && (
                              <Link href={`/teacher/sessions/${sess.id}/qr`}>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                  <QrCode className="w-3.5 h-3.5 mr-1" />
                                  <span>Projector QR</span>
                                </Button>
                              </Link>
                            )}

                            <Link href={`/teacher/sessions/${sess.id}/attendance`}>
                              <Button variant="outline" size="sm">
                                <ClipboardList className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                <span>Roster</span>
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
