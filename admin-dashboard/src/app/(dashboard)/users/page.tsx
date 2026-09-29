"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserPlus, Pencil, Trash2, Shield, UserCheck } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { UserModalForm } from "@/components/forms/UserModalForm";
import apiClient from "@/lib/api-client";
import { User, UserRole } from "@/types";
import { formatDate } from "@/lib/utils";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page };
      if (roleFilter !== "all") params.role = roleFilter;
      if (search) params.search = search;

      const res = await apiClient.get("/admin/users", { params });
      if (res.data.success) {
        setUsers(res.data.data.data);
        setPage(res.data.data.current_page);
        setLastPage(res.data.data.last_page);
        setTotal(res.data.data.total);
      }
    } catch {
      // Mock sample users if offline
      setUsers([
        { id: 1, name: "System Administrator", email: "admin@attendance.com", role: "admin", identifier_number: "ADM-001", is_active: true, created_at: "2026-01-01" },
        { id: 2, name: "Prof. Marcus Vance", email: "teacher@attendance.com", role: "teacher", identifier_number: "TCH-101", is_active: true, created_at: "2026-01-01" },
        { id: 3, name: "Elena Rostova", email: "mazer@attendance.com", role: "mazer", identifier_number: "MZR-201", is_active: true, created_at: "2026-01-01" },
        { id: 4, name: "Alex Morgan", email: "student@attendance.com", role: "student", identifier_number: "STU-9001", is_active: true, created_at: "2026-01-01" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete user.");
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
          <div className="font-semibold text-white">{user.name}</div>
          <div className="text-xs text-slate-400">{user.email}</div>
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
        <span className="font-mono text-xs text-slate-300">
          {user.identifier_number || "-"}
        </span>
      ),
    },
    {
      header: "Phone",
      cell: (user) => (
        <span className="text-xs text-slate-300">{user.phone || "-"}</span>
      ),
    },
    {
      header: "Status",
      cell: (user) => (
        <Badge variant={user.is_active ? "success" : "neutral"}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Created",
      cell: (user) => (
        <span className="text-xs text-slate-400">
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
            title="Edit User"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteUser(user)}
            className="text-slate-400 hover:text-rose-400"
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            User Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage student enrollments, faculty teachers, homeroom mazers, and system admins.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          <span>Add New User</span>
        </Button>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 w-fit">
        {[
          { label: "All Users", value: "all" },
          { label: "Students", value: "student" },
          { label: "Teachers", value: "teacher" },
          { label: "Mazers", value: "mazer" },
          { label: "Admins", value: "admin" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setRoleFilter(tab.value);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === tab.value
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchPlaceholder="Search users by name, email, or ID..."
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
