"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckSquare,
  Search,
  Filter,
  Calendar,
  User,
  GraduationCap,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Sparkles,
  BookOpen,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import apiClient from "@/lib/api-client";

interface LeaveRequestItem {
  id: number;
  student_id: number;
  class_room_id?: number;
  subject_id?: number;
  leave_type?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
  student?: {
    id: number;
    name: string;
    email: string;
    identifier_number?: string;
  };
  class_room?: {
    id: number;
    name: string;
    code: string;
  };
  subject?: {
    id: number;
    name: string;
    code: string;
  };
}

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [classes, setClasses] = useState<{ id: number; name: string; code: string }[]>([]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequestItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    leave_type: "personal",
    start_date: "",
    end_date: "",
    reason: "",
    status: "pending",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLeave, setDeletingLeave] = useState<LeaveRequestItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchLeaves();
    fetchClasses();
  }, []);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/admin/leave-requests");
      if (res.data?.success) {
        setLeaves(res.data.data?.data || []);
      }
    } catch {
      showToast("Failed to fetch leave requests", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiClient.get("/admin/classes");
      if (res.data?.success) {
        setClasses(res.data.data?.data || res.data.data || []);
      }
    } catch {
      // ignore
    }
  };

  const handleOpenEdit = (item: LeaveRequestItem) => {
    setEditingLeave(item);
    setEditFormData({
      leave_type: item.leave_type || "personal",
      start_date: item.start_date ? item.start_date.substring(0, 10) : "",
      end_date: item.end_date ? item.end_date.substring(0, 10) : "",
      reason: item.reason || "",
      status: item.status.includes("pending") ? "pending" : item.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;

    setIsSaving(true);
    try {
      const res = await apiClient.put(`/admin/leave-requests/${editingLeave.id}`, {
        leave_type: editFormData.leave_type,
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
        reason: editFormData.reason,
        status: editFormData.status,
      });

      if (res.data?.success) {
        showToast("Student leave request updated successfully!");
        setIsEditModalOpen(false);
        fetchLeaves();
      } else {
        showToast(res.data?.message || "Failed to update leave request", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Error updating leave request", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (item: LeaveRequestItem) => {
    setDeletingLeave(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLeave) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/admin/leave-requests/${deletingLeave.id}`);
      if (res.data?.success) {
        showToast("Leave request removed successfully!");
        setIsDeleteModalOpen(false);
        setLeaves((prev) => prev.filter((l) => l.id !== deletingLeave.id));
      } else {
        showToast(res.data?.message || "Failed to remove leave request", "error");
      }
    } catch {
      showToast("Failed to remove leave request", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatus = async (item: LeaveRequestItem, newStatus: "approved" | "rejected") => {
    try {
      const res = await apiClient.put(`/admin/leave-requests/${item.id}`, {
        leave_type: item.leave_type || "personal",
        start_date: item.start_date.substring(0, 10),
        end_date: item.end_date.substring(0, 10),
        reason: item.reason,
        status: newStatus,
      });
      if (res.data?.success) {
        showToast(`Leave request marked as ${newStatus}!`);
        setLeaves((prev) =>
          prev.map((l) => (l.id === item.id ? { ...l, status: newStatus } : l))
        );
      }
    } catch {
      showToast(`Failed to update status to ${newStatus}`, "error");
    }
  };

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      // Search
      const s = searchQuery.toLowerCase();
      const matchesSearch =
        !s ||
        (item.student?.name || "").toLowerCase().includes(s) ||
        (item.student?.identifier_number || "").toLowerCase().includes(s) ||
        (item.student?.email || "").toLowerCase().includes(s) ||
        (item.reason || "").toLowerCase().includes(s);

      // Status
      let matchesStatus = true;
      if (selectedStatus === "pending") {
        matchesStatus = item.status.includes("pending");
      } else if (selectedStatus !== "all") {
        matchesStatus = item.status === selectedStatus;
      }

      // Class
      let matchesClass = true;
      if (selectedClass !== "all") {
        matchesClass = (item.class_room_id ?? 0) === Number(selectedClass);
      }

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [leaves, searchQuery, selectedStatus, selectedClass]);

  // Statistics
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status.includes("pending")).length;
    const approved = leaves.filter((l) => l.status === "approved").length;
    const rejected = leaves.filter((l) => l.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approved
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          {toastMessage.text}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold mb-1">
            <CheckSquare className="w-4 h-4" />
            <span>Administrative Controls</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student Leave Requests
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View, edit start & end dates, modify review status, or remove leave applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaves}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Total Leaves</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4 bg-amber-50/50 border border-amber-200/70">
          <div className="text-xs font-medium text-amber-700">Pending Review</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</div>
        </Card>
        <Card className="p-4 bg-emerald-50/50 border border-emerald-200/70">
          <div className="text-xs font-medium text-emerald-700">Approved</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.approved}</div>
        </Card>
        <Card className="p-4 bg-rose-50/50 border border-rose-200/70">
          <div className="text-xs font-medium text-rose-700">Rejected</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{stats.rejected}</div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, ID, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Classrooms</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {["all", "pending", "approved", "rejected"].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                    selectedStatus === st
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Leave Requests Table */}
      <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            Loading student leave requests...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No leave requests found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              There are no student leave applications matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Class & Subject</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Reason & Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {item.student?.name
                            ? item.student.name.substring(0, 2).toUpperCase()
                            : "ST"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {item.student?.name || "Unknown Student"}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{item.student?.identifier_number || "No ID"}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">
                              {item.student?.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Class & Subject */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {item.class_room?.name || "General Class"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>{item.subject?.name || "All Subjects"}</span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          {item.start_date.substring(0, 10)} → {item.end_date.substring(0, 10)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Applied {item.created_at ? item.created_at.substring(0, 10) : ""}
                      </div>
                    </td>

                    {/* Reason & Type */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-1">
                        {item.leave_type || "General"}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.reason}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status.includes("pending") && (
                          <>
                            <button
                              onClick={() => handleQuickStatus(item, "approved")}
                              title="Approve Leave"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleQuickStatus(item, "rejected")}
                              title="Reject Leave"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Leave Details"
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item)}
                          title="Remove Leave"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Leave Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Leave Request"
        description="Modify start/end dates, category, justification reason, or approval status."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editingLeave && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Student</div>
                <div className="text-sm font-bold text-slate-900">
                  {editingLeave.student?.name} ({editingLeave.student?.identifier_number || "No ID"})
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Classroom</div>
                <div className="text-sm font-semibold text-indigo-600">
                  {editingLeave.class_room?.name}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                required
                value={editFormData.start_date}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                required
                value={editFormData.end_date}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, end_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Leave Category / Type
              </label>
              <select
                value={editFormData.leave_type}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, leave_type: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="sick">Sick Leave (Medical)</option>
                <option value="personal">Personal Reason</option>
                <option value="official">Official University Business</option>
                <option value="other">Other Justified Reason</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approval Status
              </label>
              <select
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, status: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Explanation
            </label>
            <textarea
              rows={3}
              required
              value={editFormData.reason}
              onChange={(e) =>
                setEditFormData({ ...editFormData, reason: e.target.value })
              }
              placeholder="State the student's reason or remarks..."
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Leave Request"
        description="Are you sure you want to delete this student leave request? This action cannot be undone."
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deletingLeave && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">
                Student: {deletingLeave.student?.name}
              </div>
              <div>
                Dates: {deletingLeave.start_date.substring(0, 10)} → {deletingLeave.end_date.substring(0, 10)}
              </div>
              <div className="line-clamp-2 italic">
                &ldquo;{deletingLeave.reason}&rdquo;
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
