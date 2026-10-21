"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  ArrowLeft,
  Clock,
  Sparkles,
  BookOpen,
  GraduationCap,
  AlertCircle,
  Play,
  RotateCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import apiClient from "@/lib/api-client";

interface TaughtSubject {
  id: number;
  class_room?: {
    id: number;
    name: string;
    code: string;
  };
  subject?: {
    id: number;
    name: string;
    code: string;
  };
}

export default function NewSessionPage() {
  const router = useRouter();
  const [taughtSubjects, setTaughtSubjects] = useState<TaughtSubject[]>([]);
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [qrRefreshSeconds, setQrRefreshSeconds] = useState(15);
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherContext();
  }, []);

  const fetchTeacherContext = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/auth/me");
      if (res.data?.success) {
        const subjects = res.data.meta?.taught_subjects || [];
        setTaughtSubjects(subjects);
        if (subjects.length > 0) {
          setSelectedClassSubjectId(subjects[0].id);
          const subjName = subjects[0].subject?.name || "Lecture";
          const className = subjects[0].class_room?.name || "";
          setTitle(`${subjName} • ${className} Attendance`);
        }
      }
    } catch {
      // Fallback demo subjects
      const mock: TaughtSubject[] = [
        {
          id: 1,
          class_room: { id: 1, name: "Year 3 - Computer Science (Class A)", code: "CS-Y3A" },
          subject: { id: 1, name: "Data Structures & Algorithms", code: "CS301" },
        },
        {
          id: 2,
          class_room: { id: 2, name: "Year 3 - Information Technology", code: "IT-Y3B" },
          subject: { id: 2, name: "Web Application Development", code: "IT302" },
        },
      ];
      setTaughtSubjects(mock);
      setSelectedClassSubjectId(mock[0].id);
      setTitle(`${mock[0].subject?.name} • ${mock[0].class_room?.name} Attendance`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectChange = (id: number) => {
    setSelectedClassSubjectId(id);
    const chosen = taughtSubjects.find((s) => s.id === id);
    if (chosen) {
      const subjName = chosen.subject?.name || "Lecture";
      const className = chosen.class_room?.name || "";
      setTitle(`${subjName} • ${className} Attendance`);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassSubjectId) {
      setError("Please select a class and subject to teach.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        class_subject_id: selectedClassSubjectId,
        title: title.trim() || "Class Attendance Session",
        duration_minutes: durationMinutes,
        qr_refresh_seconds: qrRefreshSeconds,
        late_threshold_minutes: lateThresholdMinutes,
      };

      const res = await apiClient.post("/teacher/sessions", payload);
      if (res.data?.success && res.data?.session?.id) {
        router.push(`/teacher/sessions/${res.data.session.id}/qr`);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to start attendance session. Please check your assigned subjects."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Start Live Attendance Session
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure session details and generate real-time rotating dynamic QR codes for student scanning.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLaunch} className="space-y-6">
        {/* Class & Subject Selection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <CardTitle>1. Select Class & Subject</CardTitle>
            </div>
            <CardDescription>
              Choose from the courses you are currently assigned to teach.
            </CardDescription>
          </CardHeader>

          {isLoading ? (
            <div className="py-8 flex items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-sm">Loading your assigned subjects...</span>
            </div>
          ) : taughtSubjects.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No assigned subjects found</p>
              <p className="text-xs text-slate-400 mt-1">
                Please contact the administrator to assign classes to your teacher account.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {taughtSubjects.map((item) => {
                const isSelected = selectedClassSubjectId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSubjectChange(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-mono">
                        {item.subject?.code || "SUBJ"}
                      </span>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm" />
                      )}
                    </div>
                    <div className="font-bold text-slate-900 mt-2 text-sm leading-snug">
                      {item.subject?.name || "Subject"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.class_room?.name || "Classroom"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Session Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <CardTitle>2. Session Parameters</CardTitle>
            </div>
            <CardDescription>
              Set duration, dynamic QR rotation frequency, and grace periods.
            </CardDescription>
          </CardHeader>

          <div className="space-y-5">
            <div>
              <Input
                label="Session Title / Topic"
                placeholder="e.g. Chapter 4: Database Normalization"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Duration presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Session Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      durationMinutes === mins
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {mins} Minutes
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>QR Rotation Rate (Anti-Cheat)</span>
                </label>
                <select
                  value={qrRefreshSeconds}
                  onChange={(e) => setQrRefreshSeconds(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={10}>Every 10 seconds (Highest Security)</option>
                  <option value={15}>Every 15 seconds (Recommended)</option>
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every 60 seconds</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Prevents students from sharing photos or screenshots of the QR code with friends outside class.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Late Arrival Threshold</span>
                </label>
                <select
                  value={lateThresholdMinutes}
                  onChange={(e) => setLateThresholdMinutes(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={10}>10 minutes after start</option>
                  <option value={15}>15 minutes after start (Standard)</option>
                  <option value={20}>20 minutes after start</option>
                  <option value={30}>30 minutes after start</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Students scanning after this grace period are automatically tagged as Late.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            disabled={!selectedClassSubjectId}
            className="px-6"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            <span>Launch Live Session & Display QR</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
