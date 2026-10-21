"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  RotateCcw,
  Users as UsersIcon,
  Filter,
} from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { UserModalForm } from "@/components/forms/UserModalForm";
import apiClient from "@/lib/api-client";
import { User, UserRole } from "@/types";
import { formatDate } from "@/lib/utils";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "active" | "inactive"
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Pre-configured mock data for offline resilience
  const mockMasterList: User[] = useMemo(
    () => [
      { id: 1, name: "System Administrator", email: "admin@attendance.com", role: "admin", identifier_number: "ADM-001", is_active: true, created_at: "2026-01-01" },
      { id: 2, name: "Prof. Marcus Vance", email: "teacher@attendance.com", role: "teacher", identifier_number: "TCH-101", is_active: true, created_at: "2026-01-01" },
      { id: 3, name: "Elena Rostova", email: "mazer@attendance.com", role: "mazer", identifier_number: "MZR-201", is_active: true, created_at: "2026-01-01" },
      { id: 4, name: "Alex Morgan", email: "student@attendance.com", role: "student", identifier_number: "STU-9001", is_active: true, created_at: "2026-01-01" },
      { id: 5, name: "Sarah Connor", email: "sarah@attendance.com", role: "student", identifier_number: "STU-9002", is_active: false, created_at: "2026-01-05" },
      { id: 6, name: "James Wilson", email: "jwilson@attendance.com", role: "teacher", identifier_number: "TCH-102", is_active: false, created_at: "2026-01-10" },
      { id: 7, name: "David Kim", email: "dkim@attendance.com", role: "student", identifier_number: "STU-9003", is_active: true, created_at: "2026-01-12" },
      { id: 8, name: "Aria Montgomery", email: "aria@attendance.com", role: "student", identifier_number: "STU-9004", is_active: true, created_at: "2026-01-15" },
    ],
    []
  );

  const activeFiltersCount =
    (roleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter === "active") params.is_active = "true";
      if (statusFilter === "inactive") params.is_active = "false";
      if (search.trim()) params.search = search;

      const res = await apiClient.get("/admin/users", { params });
      if (res.data.success) {
        setUsers(res.data.data.data);
        setPage(res.data.data.current_page);
        setLastPage(res.data.data.last_page);
        setTotal(res.data.data.total);
      }
    } catch {
      // Mock sample users if offline
      let filtered = [...mockMasterList];

      if (roleFilter !== "all") {
        filtered = filtered.filter((u) => u.role === roleFilter);
      }
      if (statusFilter === "active") {
        filtered = filtered.filter((u) => u.is_active);
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((u) => !u.is_active);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.identifier_number && u.identifier_number.toLowerCase().includes(q))
        );
      }

      setUsers(filtered);
      setAllUsersList(mockMasterList);
      setPage(1);
      setLastPage(1);
      setTotal(filtered.length);
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, statusFilter, search, mockMasterList]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Compute stat counts for pills & dropdown options
  const countSource = allUsersList.length > 0 ? allUsersList : users;
  const totalCount = total || countSource.length;
  const activeCount = countSource.filter((u) => u.is_active).length;
  const inactiveCount = countSource.filter((u) => !u.is_active).length;
  const studentsCount = countSource.filter((u) => u.role === "student").length;
  const teachersCount = countSource.filter((u) => u.role === "teacher").length;
  const mazersCount = countSource.filter((u) => u.role === "mazer").length;
  const adminsCount = countSource.filter((u) => u.role === "admin").length;

  const handleSaveUser = async (formData: Partial<User> & { password?: string }) => {
    if (editingUser) {
      await apiClient.put(`/admin/users/${editingUser.id}`, formData);
    } else {
      await apiClient.post("/admin/users", formData);
    }
    fetchUsers();
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) return;
    try {
      await apiClient.delete(`/admin/users/${user.id}`);
      fetchUsers();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to delete user.";
      alert(errorMsg);
    }
  };

  const getRoleVariant = (role: UserRole) => {
    switch (role) {
      case "admin": return "danger";
      case "teacher": return "primary";
      case "mazer": return "warning";
      case "student": return "success";
      default: return "neutral";
    }
  };

  const columns: Column<User>[] = [
    {
      header: "User Details",
      cell: (user) => (
        <div>
          <div className="font-semibold text-slate-900">{user.name}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (user) => (
        <Badge variant={getRoleVariant(user.role)}>
          {user.role}
        </Badge>
      ),
    },
    {
      header: "ID / Code",
      cell: (user) => (
        <span className="font-mono text-xs text-slate-700">
          {user.identifier_number || "-"}
        </span>
      ),
    },
    {
      header: "Phone",
      cell: (user) => (
        <span className="text-xs text-slate-600">{user.phone || "-"}</span>
      ),
    },
    {
      header: "Status",
      cell: (user) => (
        <Badge variant={user.is_active ? "success" : "neutral"}>
          <span className="inline-flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                user.is_active ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </Badge>
      ),
    },
    {
      header: "Created",
      cell: (user) => (
        <span className="text-xs text-slate-500">
          {formatDate(user.created_at)}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (user) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingUser(user);
              setIsModalOpen(true);
            }}
            className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            title="Edit User"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteUser(user)}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            title="Delete User"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header matching the user screenshot layout */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            User Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student enrollments, faculty teachers, homeroom mazers, and system admins.
          </p>
        </div>

        {/* Top-Right Stat Badges & Add Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setRoleFilter("all");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              statusFilter === "all" && roleFilter === "all"
                ? "border-slate-300 bg-slate-100 text-slate-900 ring-2 ring-slate-300/40"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Total: {totalCount}
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("inactive");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              statusFilter === "inactive"
                ? "border-amber-400 bg-amber-100 text-amber-900 ring-2 ring-amber-400/40"
                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100/70"
            }`}
          >
            Inactive: {inactiveCount}
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("active");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              statusFilter === "active"
                ? "border-emerald-400 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400/40"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70"
            }`}
          >
            Active: {activeCount}
          </button>

          <Button
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="shrink-0 ml-1.5"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            <span>Add New User</span>
          </Button>
        </div>
      </div>

      {/* Data Table with Unified Search and Filter Selects (matching screenshot) */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchPlaceholder="Search by user name, email, or ID..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        toolbarRight={
          <div className="flex flex-wrap items-center gap-3">
            {/* Role Select Dropdown (Driver/Role) */}
            <FilterSelect
              icon={<UsersIcon className="w-4 h-4" />}
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              options={[
                { label: `All Roles (${totalCount})`, value: "all" },
                { label: `Students (${studentsCount})`, value: "student" },
                { label: `Teachers (${teachersCount})`, value: "teacher" },
                { label: `Mazers (${mazersCount})`, value: "mazer" },
                { label: `Admins (${adminsCount})`, value: "admin" },
              ]}
            />

            {/* Status Select Dropdown (Filter/Status) */}
            <FilterSelect
              icon={<Filter className="w-4 h-4" />}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { label: "All Statuses", value: "all" },
                { label: `Active (${activeCount})`, value: "active" },
                { label: `Inactive (${inactiveCount})`, value: "inactive" },
              ]}
            />

            {/* Reset button if any filter or search is active */}
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

      {/* User Modal */}
      <UserModalForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveUser}
        initialData={editingUser}
      />
    </div>
  );
}
