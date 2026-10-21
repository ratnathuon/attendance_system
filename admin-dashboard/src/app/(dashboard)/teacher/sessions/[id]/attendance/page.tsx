"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileQuestion,
  UserCheck,
  Sparkles,
  QrCode,
  Download,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import apiClient from "@/lib/api-client";

interface RosterItem {
  student: {
    id: number;
    name: string;
    email: string;
    identifier_number?: string;
  };
  record_id?: number;
  status: "present" | "late" | "absent" | "excused" | "unmarked";
  scanned_at?: string;
  method?: string;
  remarks?: string;
}

export default function ManualAttendancePage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [session, setSession] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStudentId, setUpdatingStudentId] = useState<number | null>(null);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [sessionId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/teacher/sessions/${sessionId}/records`);
      if (res.data?.success) {
        setRoster(res.data.roster || []);
        setSession(res.data.session || null);
      }
    } catch {
      // Fallback preview roster
      const mock: RosterItem[] = [
        {
          student: { id: 4, name: "Alex Morgan", identifier_number: "STU-9001", email: "student@attendance.com" },
          status: "present",
          scanned_at: "08:05 AM",
          method: "qr",
        },
        {
          student: { id: 5, name: "Sarah Connor", identifier_number: "STU-9002", email: "sarah@attendance.com" },
          status: "late",
          scanned_at: "08:22 AM",
          method: "qr",
        },
        {
          student: { id: 7, name: "David Kim", identifier_number: "STU-9003", email: "dkim@attendance.com" },
          status: "absent",
          method: "auto_close",
        },
        {
          student: { id: 8, name: "Aria Montgomery", identifier_number: "STU-9004", email: "aria@attendance.com" },
          status: "excused",
          remarks: "Medical certificate approved",
          method: "leave_request",
        },
      ];
      setRoster(mock);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (
    studentId: number,
    newStatus: "present" | "late" | "absent" | "excused"
  ) => {
    setUpdatingStudentId(studentId);
    try {
      await apiClient.post(`/teacher/sessions/${sessionId}/attendance`, {
        student_id: studentId,
        status: newStatus,
        remarks: "Updated via teacher web portal",
      });

      // Update locally
      setRoster((prev) =>
        prev.map((item) =>
          item.student.id === studentId
            ? { ...item, status: newStatus, method: "manual" }
            : item
        )
      );
      showToast(`Student updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update attendance.");
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleBatchMarkAll = async (targetStatus: "present") => {
    if (!confirm(`Are you sure you want to mark all remaining unmarked students as ${targetStatus.toUpperCase()}?`)) {
      return;
    }

    setIsBatchUpdating(true);
    try {
      const unmarked = roster.filter((r) => r.status === "unmarked" || r.status === "absent");
      const recordsToUpdate = unmarked.map((u) => ({
        student_id: u.student.id,
        status: targetStatus,
        remarks: "Batch marked via teacher portal",
      }));

      await apiClient.post(`/teacher/sessions/${sessionId}/batch-attendance`, {
        records: recordsToUpdate,
      });

      fetchRecords();
      showToast(`Updated ${recordsToUpdate.length} students to ${targetStatus.toUpperCase()}`);
    } catch {
      // optimistic local update
      setRoster((prev) =>
        prev.map((r) => (r.status === "unmarked" ? { ...r, status: targetStatus, method: "manual" } : r))
      );
      showToast("Updated students locally.");
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      const matchSearch =
        item.student.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.student.identifier_number || "").toLowerCase().includes(search.toLowerCase());
      const matchFilter = filterStatus === "all" || item.status === filterStatus;
      return matchSearch && matchFilter;
    });
  }, [roster, search, filterStatus]);

  const counts = useMemo(() => {
    return {
      total: roster.length,
      present: roster.filter((r) => r.status === "present").length,
      late: roster.filter((r) => r.status === "late").length,
      absent: roster.filter((r) => r.status === "absent").length,
      excused: roster.filter((r) => r.status === "excused").length,
      unmarked: roster.filter((r) => r.status === "unmarked").length,
    };
  }, [roster]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Class Attendance Roster
              </h1>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Session #{sessionId}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review real-time scans, override student statuses, or batch-mark attendance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/teacher/sessions/${sessionId}/qr`}>
            <Button variant="outline" size="sm">
              <QrCode className="w-4 h-4 mr-1.5 text-indigo-600" />
              <span>Projector Dynamic QR</span>
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => handleBatchMarkAll("present")}
            isLoading={isBatchUpdating}
          >
            <UserCheck className="w-4 h-4 mr-1.5" />
            <span>Mark Unmarked as Present</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div
          onClick={() => setFilterStatus("all")}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
            filterStatus === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-xl font-extrabold">{counts.total}</div>
          <div className="text-[11px] font-semibold opacity-80 mt-0.5">Total Enrolled</div>
        </div>

        <div
          onClick={() => setFilterStatus("present")}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
            filterStatus === "present"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60"
          }`}
        >
          <div className="text-xl font-extrabold">{counts.present}</div>
          <div className="text-[11px] font-semibold opacity-90 mt-0.5">Present</div>
        </div>

        <div
          onClick={() => setFilterStatus("late")}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
            filterStatus === "late"
              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/60"
          }`}
        >
          <div className="text-xl font-extrabold">{counts.late}</div>
          <div className="text-[11px] font-semibold opacity-90 mt-0.5">Late</div>
        </div>

        <div
          onClick={() => setFilterStatus("absent")}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
            filterStatus === "absent"
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/60"
          }`}
        >
          <div className="text-xl font-extrabold">{counts.absent}</div>
          <div className="text-[11px] font-semibold opacity-90 mt-0.5">Absent</div>
        </div>

        <div
          onClick={() => setFilterStatus("excused")}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
            filterStatus === "excused"
              ? "bg-sky-600 text-white border-sky-600 shadow-xs"
              : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100/60"
          }`}
        >
          <div className="text-xl font-extrabold">{counts.excused}</div>
          <div className="text-[11px] font-semibold opacity-90 mt-0.5">Excused</div>
        </div>

        <div
          onClick={() => setFilterStatus("unmarked")}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
            filterStatus === "unmarked"
              ? "bg-slate-600 text-white border-slate-600 shadow-xs"
              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/60"
          }`}
        >
          <div className="text-xl font-extrabold">{counts.unmarked}</div>
          <div className="text-[11px] font-semibold opacity-80 mt-0.5">Unmarked</div>
        </div>
      </div>

      {/* Roster Table Card */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredRoster.length}</span> students
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs">Loading class roster...</span>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold">No students match your filter</p>
            <p className="text-xs mt-1">Try resetting search query or filter tags.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Identifier ID</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Time / Method</th>
                  <th className="py-3.5 px-4 text-right">Quick Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((item) => {
                  const isUpdating = updatingStudentId === item.student.id;
                  return (
                    <tr
                      key={item.student.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            {item.student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{item.student.name}</div>
                            <div className="text-[10px] text-slate-400">{item.student.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                        {item.student.identifier_number || "—"}
                      </td>

                      <td className="py-3 px-4">
                        {item.status === "present" && (
                          <Badge variant="success">Present</Badge>
                        )}
                        {item.status === "late" && (
                          <Badge variant="warning">Late</Badge>
                        )}
                        {item.status === "absent" && (
                          <Badge variant="danger">Absent</Badge>
                        )}
                        {item.status === "excused" && (
                          <Badge variant="info">Excused</Badge>
                        )}
                        {item.status === "unmarked" && (
                          <Badge variant="neutral">Unmarked</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>{item.scanned_at || "—"}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {item.method ? `via ${item.method}` : ""}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.student.id, "present")}
                            disabled={isUpdating}
                            title="Mark Present"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              item.status === "present"
                                ? "bg-emerald-600 text-white ring-2 ring-emerald-500/20"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            P
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.student.id, "late")}
                            disabled={isUpdating}
                            title="Mark Late"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              item.status === "late"
                                ? "bg-amber-600 text-white ring-2 ring-amber-500/20"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            }`}
                          >
                            L
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.student.id, "absent")}
                            disabled={isUpdating}
                            title="Mark Absent"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              item.status === "absent"
                                ? "bg-rose-600 text-white ring-2 ring-rose-500/20"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            A
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.student.id, "excused")}
                            disabled={isUpdating}
                            title="Mark Excused"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              item.status === "excused"
                                ? "bg-sky-600 text-white ring-2 ring-sky-500/20"
                                : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                            }`}
                          >
                            E
                          </button>
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
  );
}
