"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  User,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Filter,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import apiClient from "@/lib/api-client";

interface LeaveRequestItem {
  id: number;
  student: {
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
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function TeacherLeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveRequestItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    status: "pending",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<LeaveRequestItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/teacher/leave-requests");
      if (res.data?.success) {
        setRequests(res.data.data?.data || []);
      }
    } catch {
      showToast("Failed to fetch leave requests from server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (id: number, action: "approve" | "reject") => {
    setActioningId(id);
    try {
      const res = await apiClient.post(`/teacher/leave-requests/${id}/status`, {
        action,
        notes: `Processed by faculty teacher via web dashboard.`,
      });

      const updatedStatus = action === "approve" ? "approved" : "rejected";
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: updatedStatus } : r
        )
      );
      showToast(`Leave request ${action === "approve" ? "APPROVED" : "REJECTED"} successfully.`);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action} leave request.`);
    } finally {
      setActioningId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: LeaveRequestItem) => {
    setEditingItem(item);
    setEditFormData({
      start_date: item.start_date ? item.start_date.substring(0, 10) : "",
      end_date: item.end_date ? item.end_date.substring(0, 10) : "",
      reason: item.reason || "",
      status: item.status.includes("pending") ? "pending" : item.status,
    });
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSaving(true);
    try {
      const res = await apiClient.put(`/teacher/leave-requests/${editingItem.id}`, {
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
        reason: editFormData.reason,
        status: editFormData.status,
      });

      if (res.data?.success) {
        showToast("Leave request updated successfully!");
        setIsEditModalOpen(false);
        fetchRequests();
      } else {
        alert(res.data?.message || "Failed to update leave request");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Error updating leave request");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (item: LeaveRequestItem) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/teacher/leave-requests/${deletingItem.id}`);
      if (res.data?.success) {
        showToast("Leave request removed successfully!");
        setIsDeleteModalOpen(false);
        setRequests((prev) => prev.filter((r) => r.id !== deletingItem.id));
      } else {
        alert(res.data?.message || "Failed to delete leave request");
      }
    } catch {
      alert("Failed to delete leave request");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered requests with support for pending_mazer, pending_teacher, pending
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Tab filter
      if (activeTab === "pending" && !r.status.includes("pending")) return false;
      if (activeTab === "approved" && r.status !== "approved") return false;
      if (activeTab === "rejected" && r.status !== "rejected") return false;

      // Search filter
      const s = searchQuery.toLowerCase();
      if (!s) return true;
      return (
        (r.student?.name || "").toLowerCase().includes(s) ||
        (r.student?.identifier_number || "").toLowerCase().includes(s) ||
        (r.reason || "").toLowerCase().includes(s) ||
        (r.class_room?.name || "").toLowerCase().includes(s)
      );
    });
  }, [requests, activeTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status.includes("pending")).length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  const renderStatusBadge = (status: string) => {
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
        Pending Review
      </span>
    );
  };

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
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Faculty Approvals &amp; Management</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Student Leave Requests
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Approve, reject, edit dates &amp; reasons, or remove attendance excuse applications from students.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Tabs Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, ID, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {[
              { key: "all", label: "All Requests", count: counts.all },
              { key: "pending", label: "Pending", count: counts.pending, color: "bg-amber-100 text-amber-800" },
              { key: "approved", label: "Approved", count: counts.approved, color: "bg-emerald-100 text-emerald-800" },
              { key: "rejected", label: "Rejected", count: counts.rejected, color: "bg-rose-100 text-rose-800" },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : tab.color || "bg-white text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Requests List */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs">Loading leave requests...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No requests found</p>
          <p className="text-xs text-slate-400 mt-1">
            There are no student leave requests matching your current selection.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((item) => {
            const isActioning = actioningId === item.id;
            const isPending = item.status.includes("pending");

            return (
              <Card key={item.id} className="p-5 hover:shadow-md transition-shadow bg-white border border-slate-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Student & Request info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                        {item.student?.name ? item.student.name.charAt(0) : "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm">
                            {item.student?.name || "Student"}
                          </h3>
                          <span className="font-mono text-[11px] text-slate-500 font-medium">
                            ({item.student?.identifier_number || "STU-ID"})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.class_room?.name || "Enrolled Class"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Date range & reason */}
                    <div className="pt-2 pl-13 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {item.start_date.substring(0, 10)} → {item.end_date.substring(0, 10)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed max-w-2xl">
                        &ldquo;{item.reason}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Right: Status badge & Action buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(item.status)}

                      {/* Edit & Delete Actions */}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Leave Details"
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(item)}
                        title="Remove Leave"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Approve / Reject Buttons (Always actionable) */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecision(item.id, "reject")}
                        disabled={isActioning}
                        className={`text-xs font-semibold ${
                          item.status === "rejected"
                            ? "bg-rose-50 border-rose-300 text-rose-700 opacity-60"
                            : "text-rose-600 hover:bg-rose-50 hover:border-rose-300 border-rose-200"
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        <span>{item.status === "rejected" ? "Rejected" : "Reject"}</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleDecision(item.id, "approve")}
                        disabled={isActioning}
                        className={`text-xs font-semibold text-white ${
                          item.status === "approved"
                            ? "bg-emerald-700 opacity-60"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>{item.status === "approved" ? "Approved" : "Approve"}</span>
                      </Button>
                    </div>

                    {!isPending && (
                      <div className="text-[11px] text-slate-400">
                        Recorded on {item.created_at ? item.created_at.substring(0, 10) : ""}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Leave Request"
        description="Modify start/end dates, reason, or status."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editingItem && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex justify-between">
              <div>Student: <strong>{editingItem.student?.name}</strong></div>
              <div>Class: <strong>{editingItem.class_room?.name}</strong></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Approval Status
            </label>
            <select
              value={editFormData.status}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  status: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
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

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Leave Request"
        description="Are you sure you want to delete this leave request?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deletingItem && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">Student: {deletingItem.student?.name}</div>
              <div className="line-clamp-2 italic">&ldquo;{deletingItem.reason}&rdquo;</div>
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
