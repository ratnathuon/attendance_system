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
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    case "teacher":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
    case "mazer":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "student":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "present":
    case "active":
    case "approved":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "late":
    case "pending_mazer":
    case "pending_teacher":
    case "pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "absent":
    case "rejected":
    case "closed":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    case "excused":
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  }
}
