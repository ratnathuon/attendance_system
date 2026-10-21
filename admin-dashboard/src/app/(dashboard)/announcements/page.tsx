"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Megaphone,
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
  Radio,
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
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [classes, setClasses] = useState<ClassRoomOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  // Broadcast Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    class_room_id: "",
    title: "",
    message: "",
    priority: "normal",
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

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
      const res = await apiClient.get("/admin/announcements");
      if (res.data?.success) {
        setAnnouncements(res.data.data || []);
        if (res.data.classes) {
          setClasses(res.data.classes);
        }
      }
    } catch {
      showToast("Failed to fetch class announcements", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Broadcast New Announcement
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.class_room_id) {
      showToast("Please choose a target classroom", "error");
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await apiClient.post(
        `/admin/classes/${createFormData.class_room_id}/announcements`,
        {
          title: createFormData.title,
          message: createFormData.message,
          priority: createFormData.priority,
        }
      );

      if (res.data?.success) {
        showToast("Announcement broadcasted successfully to classroom!");
        setIsCreateModalOpen(false);
        setCreateFormData({
          class_room_id: "",
          title: "",
          message: "",
          priority: "normal",
        });
        fetchData();
      } else {
        showToast(res.data?.message || "Failed to broadcast announcement", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Error broadcasting announcement", "error");
    } finally {
      setIsBroadcasting(false);
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
        `/admin/classes/${editingItem.class_room_id}/announcements/${editingItem.id}`,
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
        `/admin/classes/${deletingItem.class_room_id}/announcements/${deletingItem.id}`
      );
      if (res.data?.success) {
        showToast("Announcement removed successfully!");
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

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const s = searchQuery.toLowerCase();
      const matchesSearch =
        !s ||
        item.title.toLowerCase().includes(s) ||
        item.message.toLowerCase().includes(s) ||
        (item.author_name || "").toLowerCase().includes(s) ||
        (item.class_room?.name || "").toLowerCase().includes(s);

      let matchesClass = true;
      if (selectedClass !== "all") {
        matchesClass = (item.class_room_id ?? 0) === Number(selectedClass);
      }

      let matchesPriority = true;
      if (selectedPriority !== "all") {
        matchesPriority = (item.priority || "normal") === selectedPriority;
      }

      return matchesSearch && matchesClass && matchesPriority;
    });
  }, [announcements, searchQuery, selectedClass, selectedPriority]);

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold mb-1">
            <Megaphone className="w-4 h-4" />
            <span>Class Communication</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Announcements & Bulletins
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Broadcast updates to students, edit existing messages, or remove outdated notices.
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
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Broadcast Notice
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search announcements, author, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Classroom Select */}
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

            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {["all", "urgent", "high", "normal"].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                    selectedPriority === p
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Announcements List */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          Loading announcements...
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <Card className="p-16 text-center bg-white border border-slate-200">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No announcements broadcasted</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            No notices match your search criteria. Click &quot;Broadcast Notice&quot; to publish a new alert to student portals.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((item) => (
            <Card
              key={item.id}
              className="p-5 bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Top: Class tag + Priority badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {item.class_room?.name || "Target Class"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ({item.class_room?.code})
                    </span>
                  </div>
                  {getPriorityBadge(item.priority)}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                  {item.title}
                </h3>

                {/* Body Message */}
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line mb-4">
                  {item.message}
                </p>
              </div>

              {/* Card Footer: Author + Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700">
                    {item.author_name || "Faculty Staff"}
                  </span>
                  <span>•</span>
                  <span>{item.created_at ? item.created_at.substring(0, 10) : ""}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    title="Edit Announcement"
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(item)}
                    title="Remove Announcement"
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

      {/* Broadcast Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Broadcast Class Announcement"
        description="Notify all enrolled students immediately in their mobile app portal."
        maxWidth="lg"
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Classroom *
              </label>
              <select
                required
                value={createFormData.class_room_id}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, class_room_id: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="">Select a classroom...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={createFormData.priority}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, priority: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                <option value="normal">Normal (Informative)</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Notice (Red Alert)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Announcement Title / Subject *
            </label>
            <Input
              required
              placeholder="e.g. Schedule Change for Midterm Exam"
              value={createFormData.title}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Notice Content *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Write the full announcement message for the students..."
              value={createFormData.message}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, message: e.target.value })
              }
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBroadcasting}>
              {isBroadcasting ? "Broadcasting..." : "Broadcast Announcement"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Class Announcement"
        description="Update title, message content, or alert urgency."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editingItem && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
              <div>
                Target Class: <strong className="text-slate-800">{editingItem.class_room?.name}</strong>
              </div>
              <div>
                Author: <strong>{editingItem.author_name}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority Level
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
              Notice Content *
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Announcement"
        description="Are you sure you want to remove this announcement? It will no longer be visible to students in the mobile app."
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deletingItem && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">
                {deletingItem.title}
              </div>
              <div className="text-rose-700">
                Class: {deletingItem.class_room?.name} ({deletingItem.class_room?.code})
              </div>
              <div className="line-clamp-2 italic text-rose-600">
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
