"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  RotateCcw,
  Shield,
  Filter,
} from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FilterSelect } from "@/components/ui/FilterSelect";
import apiClient from "@/lib/api-client";
import { ClassRoom, User } from "@/types";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [allClassesList, setAllClassesList] = useState<ClassRoom[]>([]);
  const [mazers, setMazers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [mazerStatus, setMazerStatus] = useState<"all" | "assigned" | "unassigned">("all");
  const [selectedMazerId, setSelectedMazerId] = useState<number | "">("");
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all");

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

  // Master mock dataset for offline robustness
  const mockMasterClasses: (ClassRoom & { mazer_id?: number | null })[] = useMemo(
    () => [
      {
        id: 1,
        name: "Class 10-A (Science)",
        code: "CLS-10A",
        academic_year: "2025/2026",
        grade_level: "Grade 10",
        room_number: "Room 204",
        students_count: 28,
        mazer_id: 3,
        mazer: { id: 3, name: "Elena Rostova", email: "mazer@attendance.com", role: "mazer", is_active: true },
      },
      {
        id: 2,
        name: "Class 10-B (Arts & Humanities)",
        code: "CLS-10B",
        academic_year: "2025/2026",
        grade_level: "Grade 10",
        room_number: "Room 205",
        students_count: 24,
        mazer_id: 5,
        mazer: { id: 5, name: "Kenji Sato", email: "mazer2@attendance.com", role: "mazer", is_active: true },
      },
      {
        id: 3,
        name: "Class 11-A (Advanced Physics)",
        code: "CLS-11A",
        academic_year: "2025/2026",
        grade_level: "Grade 11",
        room_number: "Room 301",
        students_count: 31,
        mazer_id: null,
        mazer: undefined,
      },
      {
        id: 4,
        name: "Class 11-B (Economics & Commerce)",
        code: "CLS-11B",
        academic_year: "2025/2026",
        grade_level: "Grade 11",
        room_number: "Room 302",
        students_count: 26,
        mazer_id: 3,
        mazer: { id: 3, name: "Elena Rostova", email: "mazer@attendance.com", role: "mazer", is_active: true },
      },
      {
        id: 5,
        name: "Class 12-A (Senior Science)",
        code: "CLS-12A",
        academic_year: "2024/2025",
        grade_level: "Grade 12",
        room_number: "Room 401",
        students_count: 19,
        mazer_id: null,
        mazer: undefined,
      },
    ],
    []
  );

  const activeFiltersCount =
    (mazerStatus !== "all" ? 1 : 0) +
    (selectedMazerId !== "" ? 1 : 0) +
    (gradeLevelFilter !== "all" ? 1 : 0) +
    (academicYearFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setMazerStatus("all");
    setSelectedMazerId("");
    setGradeLevelFilter("all");
    setAcademicYearFilter("all");
    setSearch("");
    setPage(1);
  };

  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (search.trim()) params.search = search;
      if (mazerStatus !== "all") params.mazer_status = mazerStatus;
      if (selectedMazerId !== "") params.mazer_id = selectedMazerId;
      if (gradeLevelFilter !== "all") params.grade_level = gradeLevelFilter;
      if (academicYearFilter !== "all") params.academic_year = academicYearFilter;

      const res = await apiClient.get("/admin/classes", { params });
      if (res.data.success) {
        setClasses(res.data.data.data);
        setPage(res.data.data.current_page);
        setLastPage(res.data.data.last_page);
        setTotal(res.data.data.total);
      }
    } catch {
      // Mock preview
      let filtered = [...mockMasterClasses];

      if (mazerStatus === "assigned") {
        filtered = filtered.filter((c) => Boolean(c.mazer || c.mazer_id));
      } else if (mazerStatus === "unassigned") {
        filtered = filtered.filter((c) => !c.mazer && !c.mazer_id);
      }

      if (selectedMazerId !== "") {
        filtered = filtered.filter((c) => (c.mazer?.id ?? c.mazer_id) === Number(selectedMazerId));
      }

      if (gradeLevelFilter !== "all") {
        filtered = filtered.filter((c) => c.grade_level === gradeLevelFilter);
      }

      if (academicYearFilter !== "all") {
        filtered = filtered.filter((c) => c.academic_year === academicYearFilter);
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            (c.room_number && c.room_number.toLowerCase().includes(q))
        );
      }

      setClasses(filtered);
      setAllClassesList(mockMasterClasses);
      setPage(1);
      setLastPage(1);
      setTotal(filtered.length);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, mazerStatus, selectedMazerId, gradeLevelFilter, academicYearFilter, mockMasterClasses]);

  const fetchMazers = async () => {
    try {
      const res = await apiClient.get("/admin/users", { params: { role: "mazer", per_page: 100 } });
      if (res.data.success) {
        setMazers(res.data.data.data);
      }
    } catch {
      setMazers([
        { id: 3, name: "Elena Rostova", email: "mazer@attendance.com", role: "mazer", is_active: true },
        { id: 5, name: "Kenji Sato", email: "mazer2@attendance.com", role: "mazer", is_active: true },
      ]);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchMazers();
  }, []);

  // Compute stat counts for top-right badges matching the user screenshot
  const countSource = allClassesList.length > 0 ? allClassesList : classes;
  const totalClassesCount = total || countSource.length;
  const assignedClassesCount = countSource.filter((c) => Boolean(c.mazer || (c as any).mazer_id)).length;
  const unassignedClassesCount = countSource.filter((c) => !c.mazer && !(c as any).mazer_id).length;

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
      const payload: Record<string, unknown> = {
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
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to save class.";
      setFormError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cls: ClassRoom) => {
    if (!confirm(`Delete class "${cls.name}"?`)) return;
    try {
      await apiClient.delete(`/admin/classes/${cls.id}`);
      fetchClasses();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to delete class.";
      alert(errorMsg);
    }
  };

  const columns: Column<ClassRoom>[] = [
    {
      header: "Class Name & Code",
      cell: (cls) => (
        <div>
          <div className="font-semibold text-slate-900">{cls.name}</div>
          <div className="text-xs text-indigo-600 font-mono font-medium">{cls.code}</div>
        </div>
      ),
    },
    {
      header: "Assigned Mazer (Advisor)",
      cell: (cls) =>
        cls.mazer ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold">
              {cls.mazer.name.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">{cls.mazer.name}</div>
              <div className="text-[10px] text-slate-500">{cls.mazer.email}</div>
            </div>
          </div>
        ) : (
          <Badge variant="warning">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unassigned
            </span>
          </Badge>
        ),
    },
    {
      header: "Academic Year",
      cell: (cls) => <span className="text-xs text-slate-700">{cls.academic_year}</span>,
    },
    {
      header: "Room / Grade",
      cell: (cls) => (
        <span className="text-xs text-slate-600">
          {cls.room_number || "TBD"} • {cls.grade_level || "Standard"}
        </span>
      ),
    },
    {
      header: "Students Enrolled",
      cell: (cls) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
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
            className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            title="Edit Class"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(cls)}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
      {/* Header with Stat Badges matching the user screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Classrooms & Mazer Advisors
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure cohorts, assign homeroom Mazers for 1st-level attendance approval, and track enrollments.
          </p>
        </div>

        {/* Top-Right Badges: Total, Unassigned, Assigned (like screenshot) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setMazerStatus("all");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              mazerStatus === "all"
                ? "border-slate-300 bg-slate-100 text-slate-900 ring-2 ring-slate-300/40"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Total: {totalClassesCount}
          </button>

          <button
            type="button"
            onClick={() => {
              setMazerStatus("unassigned");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              mazerStatus === "unassigned"
                ? "border-amber-400 bg-amber-100 text-amber-900 ring-2 ring-amber-400/40"
                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100/70"
            }`}
          >
            Unassigned: {unassignedClassesCount}
          </button>

          <button
            type="button"
            onClick={() => {
              setMazerStatus("assigned");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              mazerStatus === "assigned"
                ? "border-emerald-400 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400/40"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70"
            }`}
          >
            Assigned: {assignedClassesCount}
          </button>

          <Button onClick={() => openModal()} className="shrink-0 ml-1.5">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Class</span>
          </Button>
        </div>
      </div>

      {/* Data Table with Unified Search and Filter Selects (matching screenshot) */}
      <DataTable
        columns={columns}
        data={classes}
        isLoading={isLoading}
        searchPlaceholder="Search by class name, code, room, or assigned mazer..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        toolbarRight={
          <div className="flex flex-wrap items-center gap-3">
            {/* Driver / Mazer Advisor filter (All Drivers (8)) */}
            <FilterSelect
              icon={<Shield className="w-4 h-4" />}
              value={selectedMazerId}
              onChange={(val) => {
                setSelectedMazerId(val ? Number(val) : "");
                setPage(1);
              }}
              options={[
                { label: `All Mazers (${mazers.length})`, value: "" },
                ...mazers.map((m) => ({
                  label: m.name,
                  value: m.id,
                })),
              ]}
            />

            {/* Status filter (All Statuses) */}
            <FilterSelect
              icon={<Filter className="w-4 h-4" />}
              value={mazerStatus}
              onChange={(val) => {
                setMazerStatus(val as any);
                setPage(1);
              }}
              options={[
                { label: "All Statuses", value: "all" },
                { label: `Assigned (${assignedClassesCount})`, value: "assigned" },
                { label: `Unassigned (${unassignedClassesCount})`, value: "unassigned" },
              ]}
            />

            {/* Grade Level filter */}
            <FilterSelect
              value={gradeLevelFilter}
              onChange={(val) => {
                setGradeLevelFilter(val);
                setPage(1);
              }}
              options={[
                { label: "All Grades", value: "all" },
                { label: "Grade 10", value: "Grade 10" },
                { label: "Grade 11", value: "Grade 11" },
                { label: "Grade 12", value: "Grade 12" },
              ]}
            />

            {/* Reset button if any filter or search active */}
            {(activeFiltersCount > 0 || search.trim() !== "") && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs flex items-center gap-1 font-medium cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        }
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
