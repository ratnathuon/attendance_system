"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Megaphone,
  Radio,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  GraduationCap,
  Edit3,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Send,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import apiClient from "@/lib/api-client";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority?: "normal" | "high" | "urgent";
  author_name?: string;
  author_role?: string;
  created_at?: string;
  class_room_id?: number;
  class_room?: {
    id: number;
    name: string;
    code: string;
  };
}

interface ClassRoomOption {
  id: number;
  name: string;
  code: string;
  room_number?: string;
}

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [classes, setClasses] = useState<ClassRoomOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");

  // Broadcast Form State (Matching Mobile App Experience)
  const [broadcastClassId, setBroadcastClassId] = useState<string>("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState<string>("normal");
  const [isPosting, setIsPosting] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    message: "",
    priority: "normal",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<AnnouncementItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/teacher/announcements");
      if (res.data?.success) {
        setAnnouncements(res.data.data || []);
        if (res.data.classes) {
          setClasses(res.data.classes);
          if (res.data.classes.length > 0 && !broadcastClassId) {
            setBroadcastClassId(String(res.data.classes[0].id));
          }
        }
      }
    } catch {
      showToast("Failed to fetch classroom announcements", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Broadcast Submission (Just like Mobile App!)
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastClassId) {
      showToast("Please choose a target classroom to broadcast to", "error");
      return;
    }
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast("Please provide both a title and announcement message", "error");
      return;
    }

    setIsPosting(true);
    try {
      const res = await apiClient.post(
        `/teacher/classes/${broadcastClassId}/announcements`,
        {
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          priority: broadcastPriority,
        }
      );

      if (res.data?.success) {
        showToast("Announcement broadcasted successfully to all enrolled students!");
        setBroadcastTitle("");
        setBroadcastMessage("");
        setBroadcastPriority("normal");
        fetchData();
      } else {
        showToast(res.data?.message || "Failed to broadcast announcement", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Error broadcasting announcement", "error");
    } finally {
      setIsPosting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: AnnouncementItem) => {
    setEditingItem(item);
    setEditFormData({
      title: item.title,
      message: item.message,
      priority: item.priority || "normal",
    });
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.class_room_id) return;

    setIsUpdating(true);
    try {
      const res = await apiClient.put(
        `/teacher/classes/${editingItem.class_room_id}/announcements/${editingItem.id}`,
        {
          title: editFormData.title,
          message: editFormData.message,
          priority: editFormData.priority,
        }
      );

      if (res.data?.success) {
        showToast("Announcement updated successfully!");
        setIsEditModalOpen(false);
        fetchData();
      } else {
        showToast(res.data?.message || "Failed to update announcement", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Error updating announcement", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (item: AnnouncementItem) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem || !deletingItem.class_room_id) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.delete(
        `/teacher/classes/${deletingItem.class_room_id}/announcements/${deletingItem.id}`
      );
      if (res.data?.success) {
        showToast("Announcement deleted successfully!");
        setIsDeleteModalOpen(false);
        setAnnouncements((prev) => prev.filter((a) => a.id !== deletingItem.id));
      } else {
        showToast(res.data?.message || "Failed to delete announcement", "error");
      }
    } catch {
      showToast("Failed to delete announcement", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const s = searchQuery.toLowerCase();
      const matchesSearch =
        !s ||
        item.title.toLowerCase().includes(s) ||
        item.message.toLowerCase().includes(s) ||
        (item.class_room?.name || "").toLowerCase().includes(s);

      let matchesClass = true;
      if (selectedClassFilter !== "all") {
        matchesClass = (item.class_room_id ?? 0) === Number(selectedClassFilter);
      }

      return matchesSearch && matchesClass;
    });
  }, [announcements, searchQuery, selectedClassFilter]);

  const getPriorityBadge = (p?: string) => {
    const priority = (p || "normal").toLowerCase();
    if (priority === "urgent") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          URGENT
        </span>
      );
    }
    if (priority === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          HIGH
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        NORMAL
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold mb-1">
            <Radio className="w-4 h-4 animate-pulse text-indigo-600" />
            <span>Faculty Broadcast Station</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Broadcast Announcements
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Send instant notices, exam alerts, and classroom updates to enrolled students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Broadcast Compose Box (Like Mobile App Card!) */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Broadcast Class Announcement
              </h2>
              <p className="text-xs text-slate-500">
                Instantly shows in student mobile app notifications &amp; dashboards.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Class *
              </label>
              <select
                required
                value={broadcastClassId}
                onChange={(e) => setBroadcastClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
              >
                {classes.length === 0 && (
                  <option value="">No classrooms available</option>
                )}
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {c.room_number ? `• Room ${c.room_number}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={broadcastPriority}
                onChange={(e) => setBroadcastPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
              >
                <option value="normal">Normal (Informative)</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Notice (Immediate Alert)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Announcement Title / Subject *
            </label>
            <Input
              required
              placeholder="e.g. Bring scientific calculator for tomorrow's quiz"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              className="py-2.5 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message to Enrolled Students *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Write the full message or instructions for your students..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full p-3.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Broadcasted under your faculty signature automatically.
            </span>
            <Button
              type="submit"
              disabled={isPosting || classes.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 shadow-sm"
            >
              {isPosting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Broadcast Notice
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Announcements History & Management */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Broadcast History ({announcements.length})
            </h2>
            <p className="text-xs text-slate-500">
              Past announcements posted to your classes. You can edit content or delete outdated notices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by class */}
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              <option value="all">All Taught Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            Loading class announcements...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No broadcasts found</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              You haven&apos;t posted any announcements to the selected class yet. Use the compose form above to send your first broadcast!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAnnouncements.map((item) => (
              <Card
                key={item.id}
                className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {item.class_room?.name || "Class"}
                    </span>
                    {getPriorityBadge(item.priority)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1.5 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line mb-4">
                    {item.message}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">
                      {item.author_name || "Teacher"}
                    </span>
                    <span>•</span>
                    <span>{item.created_at ? item.created_at.substring(0, 10) : ""}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Notice"
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(item)}
                      title="Delete Notice"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Announcement"
        description="Update notice subject, priority or instructions."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={editFormData.priority}
              onChange={(e) =>
                setEditFormData({ ...editFormData, priority: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            >
              <option value="normal">Normal</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Title / Subject *
            </label>
            <Input
              required
              value={editFormData.title}
              onChange={(e) =>
                setEditFormData({ ...editFormData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notice Message *
            </label>
            <textarea
              rows={4}
              required
              value={editFormData.message}
              onChange={(e) =>
                setEditFormData({ ...editFormData, message: e.target.value })
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
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Announcement"
        description="Are you sure you want to remove this announcement from the student portal?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deletingItem && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">{deletingItem.title}</div>
              <div className="italic text-rose-600 line-clamp-2">
                &ldquo;{deletingItem.message}&rdquo;
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
