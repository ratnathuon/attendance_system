"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, Filter, RefreshCw, QrCode, FileText } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import apiClient from "@/lib/api-client";
import { AttendanceRecord, ClassRoom, Subject } from "@/types";
import { formatDateTime, getStatusBadgeClass } from "@/lib/utils";

export default function ReportsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const today = new Date().toISOString().split("T")[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(lastMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDropdowns = async () => {
    try {
      const [classRes, subjRes] = await Promise.all([
        apiClient.get("/admin/classes"),
        apiClient.get("/admin/subjects"),
      ]);
      if (classRes.data.success) setClasses(classRes.data.data.data);
      if (subjRes.data.success) setSubjects(subjRes.data.data.data);
    } catch {
      // ignore
    }
  };

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        start_date: startDate,
        end_date: endDate,
      };
      if (selectedClass) params.class_room_id = selectedClass;
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedStatus) params.status = selectedStatus;

      const res = await apiClient.get("/admin/reports/attendance", { params });
      if (res.data.success) {
        setRecords(res.data.data.data);
        setPage(res.data.data.current_page);
        setLastPage(res.data.data.last_page);
        setTotal(res.data.data.total);
      }
    } catch {
      // Mock preview
      setRecords([
        {
          id: 1,
          attendance_session_id: 1,
          student_id: 4,
          status: "present",
          scanned_at: new Date().toISOString(),
          method: "qr_scan",
          remarks: "Verified via rotating HMAC token",
          student: { id: 4, name: "Alex Morgan", email: "student@attendance.com", role: "student", identifier_number: "STU-9001", is_active: true },
          attendance_session: {
            id: 1,
            class_subject_id: 1,
            teacher_id: 2,
            session_date: today,
            start_time: today,
            status: "active",
            qr_secret: "mock",
            qr_refresh_seconds: 15,
            allow_late: true,
            late_threshold_minutes: 15,
            class_subject: {
              id: 1,
              class_room_id: 1,
              subject_id: 1,
              teacher_id: 2,
              class_room: { id: 1, name: "Class 10-A", code: "CLS-10A", academic_year: "2025/2026" },
              subject: { id: 1, name: "Advanced Mathematics", code: "MATH-301", credit_hours: 4 },
            }
          }
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [page, startDate, endDate, selectedClass, selectedSubject, selectedStatus]);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Record ID",
      "Student Name",
      "Identifier",
      "Class",
      "Subject",
      "Session Date",
      "Scanned At",
      "Method",
      "Status",
      "Remarks",
    ];

    const rows = records.map((r) => [
      r.id,
      `"${r.student?.name || ""}"`,
      r.student?.identifier_number || "",
      `"${r.attendance_session?.class_subject?.class_room?.name || ""}"`,
      `"${r.attendance_session?.class_subject?.subject?.name || ""}"`,
      r.attendance_session?.session_date || "",
      r.scanned_at || "",
      r.method,
      r.status,
      `"${r.remarks || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      header: "Student",
      cell: (r) => (
        <div>
          <div className="font-semibold text-white">{r.student?.name}</div>
          <div className="text-xs text-indigo-400 font-mono">
            {r.student?.identifier_number || r.student?.email}
          </div>
        </div>
      ),
    },
    {
      header: "Class & Subject",
      cell: (r) => (
        <div>
          <div className="font-medium text-slate-200">
            {r.attendance_session?.class_subject?.subject?.name || "Subject"}
          </div>
          <div className="text-xs text-slate-400">
            {r.attendance_session?.class_subject?.class_room?.name || "Class"}
          </div>
        </div>
      ),
    },
    {
      header: "Scanned / Recorded",
      cell: (r) => (
        <span className="text-xs text-slate-300">
          {formatDateTime(r.scanned_at || r.attendance_session?.start_time)}
        </span>
      ),
    },
    {
      header: "Method",
      cell: (r) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60 font-mono">
          <QrCode className="w-3 h-3 text-indigo-400" />
          {r.method.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusBadgeClass(
            r.status
          )}`}
        >
          {r.status}
        </span>
      ),
    },
    {
      header: "Remarks",
      cell: (r) => (
        <span className="text-xs text-slate-400 line-clamp-1">
          {r.remarks || "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            System Attendance Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit student logs, download accredited attendance sheets, and filter across cohorts.
          </p>
        </div>

        <Button onClick={handleExportCSV} variant="secondary" className="shrink-0">
          <Download className="w-4 h-4 mr-2" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Report Filter Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />

          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />

          <Select
            label="Filter Classroom"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPage(1);
            }}
            options={[
              { label: "All Classrooms", value: "" },
              ...classes.map((c) => ({ label: c.name, value: c.id })),
            ]}
          />

          <Select
            label="Filter Subject"
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setPage(1);
            }}
            options={[
              { label: "All Subjects", value: "" },
              ...subjects.map((s) => ({ label: s.name, value: s.id })),
            ]}
          />

          <Select
            label="Status"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { label: "All Statuses", value: "" },
              { label: "Present", value: "present" },
              { label: "Late", value: "late" },
              { label: "Absent", value: "absent" },
              { label: "Excused", value: "excused" },
            ]}
          />
        </div>
      </div>

      {/* Results Table */}
      <DataTable
        columns={columns}
        data={records}
        isLoading={isLoading}
        currentPage={page}
        lastPage={lastPage}
        total={total}
        onPageChange={(p) => setPage(p)}
        emptyMessage="No attendance records found matching current date and filters."
      />
    </div>
  );
}
