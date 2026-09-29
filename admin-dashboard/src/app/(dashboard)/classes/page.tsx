"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, GraduationCap, Users } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import apiClient from "@/lib/api-client";
import { ClassRoom, User } from "@/types";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [mazers, setMazers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [gradeLevel, setGradeLevel] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [mazerId, setMazerId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/admin/classes", {
        params: { page, search },
      });
      if (res.data.success) {
        setClasses(res.data.data.data);
        setPage(res.data.data.current_page);
        setLastPage(res.data.data.last_page);
        setTotal(res.data.data.total);
      }
    } catch {
      // Mock preview
      setClasses([
        { id: 1, name: "Class 10-A (Science)", code: "CLS-10A", academic_year: "2025/2026", grade_level: "Grade 10", room_number: "Room 204", students_count: 28, mazer: { id: 3, name: "Elena Rostova", email: "mazer@attendance.com", role: "mazer", is_active: true } },
        { id: 2, name: "Class 10-B (Arts & Humanities)", code: "CLS-10B", academic_year: "2025/2026", grade_level: "Grade 10", room_number: "Room 205", students_count: 24, mazer: { id: 5, name: "Kenji Sato", email: "mazer2@attendance.com", role: "mazer", is_active: true } },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  const fetchMazers = async () => {
    try {
      const res = await apiClient.get("/admin/users", { params: { role: "mazer", per_page: 100 } });
      if (res.data.success) {
        setMazers(res.data.data.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchMazers();
  }, [fetchClasses]);

  const openModal = (cls?: ClassRoom) => {
    if (cls) {
      setEditingClass(cls);
      setName(cls.name);
      setCode(cls.code);
      setAcademicYear(cls.academic_year || "2025/2026");
      setGradeLevel(cls.grade_level || "");
      setRoomNumber(cls.room_number || "");
      setMazerId(cls.mazer_id || "");
      setDescription(cls.description || "");
    } else {
      setEditingClass(null);
      setName("");
      setCode("");
      setAcademicYear("2025/2026");
      setGradeLevel("");
      setRoomNumber("");
      setMazerId("");
      setDescription("");
    }
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload: any = {
        name,
        code,
        academic_year: academicYear,
        grade_level: gradeLevel || null,
        room_number: roomNumber || null,
        mazer_id: mazerId ? Number(mazerId) : null,
        description: description || null,
      };

      if (editingClass) {
        await apiClient.put(`/admin/classes/${editingClass.id}`, payload);
      } else {
        await apiClient.post("/admin/classes", payload);
      }

      setIsModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to save class.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cls: ClassRoom) => {
    if (!confirm(`Delete class "${cls.name}"?`)) return;
    try {
      await apiClient.delete(`/admin/classes/${cls.id}`);
      fetchClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete class.");
    }
  };

  const columns: Column<ClassRoom>[] = [
    {
      header: "Class Name & Code",
      cell: (cls) => (
        <div>
          <div className="font-semibold text-white">{cls.name}</div>
          <div className="text-xs text-indigo-400 font-mono">{cls.code}</div>
        </div>
      ),
    },
    {
      header: "Assigned Mazer (Advisor)",
      cell: (cls) => (
        cls.mazer ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
              {cls.mazer.name.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">{cls.mazer.name}</div>
              <div className="text-[10px] text-slate-400">{cls.mazer.email}</div>
            </div>
          </div>
        ) : (
          <Badge variant="warning">Unassigned</Badge>
        )
      ),
    },
    {
      header: "Academic Year",
      cell: (cls) => <span className="text-xs text-slate-300">{cls.academic_year}</span>,
    },
    {
      header: "Room / Grade",
      cell: (cls) => (
        <span className="text-xs text-slate-400">
          {cls.room_number || "TBD"} • {cls.grade_level || "Standard"}
        </span>
      ),
    },
    {
      header: "Students Enrolled",
      cell: (cls) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>{cls.students_count ?? 0} Students</span>
        </div>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (cls) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal(cls)}
            title="Edit Class"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(cls)}
            className="text-slate-400 hover:text-rose-400"
            title="Delete Class"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Classrooms & Mazer Advisors
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure cohorts, assign homeroom Mazers for 1st-level attendance approval, and track enrollments.
          </p>
        </div>

        <Button onClick={() => openModal()} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          <span>Create Class</span>
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={classes}
        isLoading={isLoading}
        searchPlaceholder="Search classes by name or code..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        currentPage={page}
        lastPage={lastPage}
        total={total}
        onPageChange={(p) => setPage(p)}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? "Edit Classroom" : "Create New Classroom"}
        description="Classrooms group students and designate a primary Mazer advisor."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Class Name"
            placeholder="e.g. Class 10-A (Science)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Class Code"
              placeholder="e.g. CLS-10A"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              label="Academic Year"
              placeholder="2025/2026"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Grade / Level"
              placeholder="e.g. Grade 10"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            />
            <Input
              label="Default Room Number"
              placeholder="e.g. Room 204"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </div>

          <Select
            label="Assigned Mazer (Class Advisor)"
            value={mazerId}
            onChange={(e) => setMazerId(e.target.value ? Number(e.target.value) : "")}
            options={[
              { label: "-- Select a Mazer --", value: "" },
              ...mazers.map((m) => ({
                label: `${m.name} (${m.email})`,
                value: m.id,
              })),
            ]}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingClass ? "Save Changes" : "Create Class"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
