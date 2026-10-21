"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, BookOpen, UserCheck, Trash2, Calendar, Clock } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { AssignmentModalForm } from "@/components/forms/AssignmentModalForm";
import apiClient from "@/lib/api-client";
import { Subject, ClassRoom, User, ClassSubject } from "@/types";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassSubject[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subject Modal state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creditHours, setCreditHours] = useState(3);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assignment Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subjRes, assignRes, classRes, teacherRes] = await Promise.all([
        apiClient.get("/admin/subjects"),
        apiClient.get("/admin/assignments"),
        apiClient.get("/admin/classes"),
        apiClient.get("/admin/users", { params: { role: "teacher", per_page: 100 } }),
      ]);

      if (subjRes.data.success) setSubjects(subjRes.data.data.data);
      if (assignRes.data.success) setAssignments(assignRes.data.data.data);
      if (classRes.data.success) setClasses(classRes.data.data.data);
      if (teacherRes.data.success) setTeachers(teacherRes.data.data.data);
    } catch {
      // Mock preview
      setSubjects([
        { id: 1, name: "Advanced Mathematics", code: "MATH-301", credit_hours: 4 },
        { id: 2, name: "Algorithms & Data Structures", code: "CS-201", credit_hours: 3 },
        { id: 3, name: "Database Engineering", code: "CS-202", credit_hours: 3 },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.post("/admin/subjects", {
        name,
        code,
        credit_hours: creditHours,
        description,
      });
      setIsSubjectModalOpen(false);
      setName("");
      setCode("");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create subject.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignTeacher = async (data: any) => {
    await apiClient.post("/admin/assignments/teacher", data);
    fetchData();
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("Remove this teacher teaching assignment?")) return;
    try {
      await apiClient.delete(`/admin/assignments/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to remove assignment.");
    }
  };

  const subjectColumns: Column<Subject>[] = [
    {
      header: "Subject Name & Code",
      cell: (subj) => (
        <div>
          <div className="font-semibold text-slate-900">{subj.name}</div>
          <div className="text-xs text-indigo-600 font-mono font-medium">{subj.code}</div>
        </div>
      ),
    },
    {
      header: "Credits",
      cell: (subj) => (
        <span className="text-xs text-slate-700 font-medium">
          {subj.credit_hours} SKS / Credits
        </span>
      ),
    },
    {
      header: "Description",
      cell: (subj) => (
        <span className="text-xs text-slate-500 line-clamp-1">
          {subj.description || "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Subjects & Faculty Assignments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Curriculum subjects, lecture schedules, and teacher assignment to classrooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsAssignModalOpen(true)}
            disabled={classes.length === 0 || subjects.length === 0}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            <span>Assign Teacher</span>
          </Button>

          <Button onClick={() => setIsSubjectModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            <span>Add Subject</span>
          </Button>
        </div>
      </div>

      {/* Teacher Teaching Assignments Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Active Class Schedules & Teaching Faculty
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.length === 0 ? (
            <div className="col-span-full p-8 rounded-2xl border border-slate-200 bg-white text-center text-xs text-slate-500 shadow-xs">
              No class-subject teacher assignments configured yet. Click &quot;Assign Teacher&quot; above.
            </div>
          ) : (
            assignments.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white relative group shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      {item.class_room?.code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {item.subject?.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDeleteAssignment(item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <UserCheck className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span className="font-semibold text-slate-900">
                      {item.teacher?.name || "Teacher"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.schedule_day || "Flexible Schedule"}</span>
                  </div>

                  {item.start_time && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {item.start_time} - {item.end_time || ""} ({item.room || "Room TBD"})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subjects Catalog */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Curriculum Subject Catalog
        </h3>
        <DataTable
          columns={subjectColumns}
          data={subjects}
          isLoading={isLoading}
        />
      </div>

      {/* Add Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Create New Subject"
        description="Add a course subject to the institutional curriculum catalog."
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          <Input
            label="Subject Name"
            placeholder="e.g. Database Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Subject Code"
              placeholder="e.g. CS-202"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              label="Credit Hours (SKS)"
              type="number"
              min={1}
              max={12}
              value={creditHours}
              onChange={(e) => setCreditHours(Number(e.target.value))}
              required
            />
          </div>

          <Input
            label="Description (optional)"
            placeholder="Brief overview of course topics..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSubjectModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Create Subject
            </Button>
          </div>
        </form>
      </Modal>

      {/* Teacher Assignment Modal */}
      <AssignmentModalForm
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        onSubmitTeacherAssignment={handleAssignTeacher}
      />
    </div>
  );
}
