import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "teacher":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "mazer":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "student":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "present":
    case "active":
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "late":
    case "pending_mazer":
    case "pending_teacher":
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "absent":
    case "rejected":
    case "closed":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "excused":
      return "bg-sky-50 text-sky-700 border-sky-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
