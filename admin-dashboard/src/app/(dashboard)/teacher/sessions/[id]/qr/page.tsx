"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Users,
  Maximize2,
  Minimize2,
  XCircle,
  ClipboardList,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Radio,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import apiClient from "@/lib/api-client";

export default function DynamicQrPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [qrPayload, setQrPayload] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [expiresIn, setExpiresIn] = useState<number>(15);
  const [countdown, setCountdown] = useState<number>(15);
  const [scannedCount, setScannedCount] = useState<number>(0);
  const [totalEnrolled, setTotalEnrolled] = useState<number>(0);
  const [recentAttendees, setRecentAttendees] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQrToken = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await apiClient.get(`/teacher/sessions/${sessionId}/qr`);
      if (res.data?.success) {
        const qrData = res.data.qr || {};
        const stats = res.data.stats || {};
        setQrPayload(qrData.qr_payload || `{"session_id":${sessionId}}`);
        const exp = qrData.expires_in || 15;
        setExpiresIn(exp);
        setCountdown(exp);
        setScannedCount(stats.scanned_count || 0);
        setTotalEnrolled(stats.total_enrolled || 0);
        setError(null);
      }
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.data?.message?.includes("closed")) {
        setError("This attendance session has been closed.");
      } else {
        // Fallback demo payload
        setQrPayload(
          JSON.stringify({
            session_id: Number(sessionId),
            timestamp: Date.now(),
            token: "demo-rot-" + Math.random().toString(36).slice(2, 8),
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const fetchSessionRoster = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await apiClient.get(`/teacher/sessions/${sessionId}/records`);
      if (res.data?.success && res.data.roster) {
        const roster = res.data.roster;
        const attended = roster.filter((r: any) => r.status === "present" || r.status === "late");
        setRecentAttendees(attended.slice(0, 8));
        setScannedCount(attended.length);
        setTotalEnrolled(roster.length);
      }
    } catch {
      // preview
    }
  }, [sessionId]);

  // Initial fetch and token countdown loop
  useEffect(() => {
    fetchQrToken();
    fetchSessionRoster();

    // 1-second countdown ticker
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQrToken();
          fetchSessionRoster();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchQrToken, fetchSessionRoster]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const handleCloseSession = async () => {
    setIsClosing(true);
    try {
      await apiClient.post(`/teacher/sessions/${sessionId}/close`, {
        mark_remaining_absent: true,
      });
      setShowCloseModal(false);
      router.push(`/teacher/sessions/${sessionId}/attendance`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to close session.");
    } finally {
      setIsClosing(false);
    }
  };

  const percentage = totalEnrolled > 0 ? Math.round((scannedCount / totalEnrolled) * 100) : 0;
  const progressPercent = Math.max(0, Math.min(100, (countdown / expiresIn) * 100));

  return (
    <div className={`space-y-6 ${isFullscreen ? "p-8 bg-slate-900 text-white min-h-screen" : ""}`}>
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Live Dynamic QR Attendance
              </h1>
              <Badge variant="success">Active Session</Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Display this on classroom projector • Token rotates automatically every {expiresIn} seconds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 mr-1.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 mr-1.5" />
                <span>Projector Fullscreen</span>
              </>
            )}
          </Button>

          <Link href={`/teacher/sessions/${sessionId}/attendance`}>
            <Button variant="outline" size="sm">
              <ClipboardList className="w-4 h-4 mr-1.5" />
              <span>Manual Roster</span>
            </Button>
          </Link>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowCloseModal(true)}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            <span>End Session</span>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-rose-800">{error}</h3>
          <p className="text-xs text-rose-600">
            You can review the attendance roster or view historical records.
          </p>
          <div className="pt-2">
            <Link href={`/teacher/sessions/${sessionId}/attendance`}>
              <Button size="sm">View Attendance Records</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main QR Code Display - Large for classroom projection */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <Card className="w-full p-8 sm:p-10 flex flex-col items-center text-center relative overflow-hidden bg-white shadow-xl border-slate-200">
              {/* Subtle ambient halo */}
              <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header inside card */}
              <div className="mb-6 flex items-center justify-between w-full border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Scan with RUPP Mobile App
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Point camera or tap "Scan Attendance" in student app
                    </p>
                  </div>
                </div>

                {/* Circular timer badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span>{countdown}s</span>
                </div>
              </div>

              {/* Big High-Quality QR Code Frame */}
              <div className="p-5 rounded-3xl bg-white border-2 border-slate-200 shadow-lg relative group transition-all">
                {qrPayload ? (
                  <QRCodeSVG
                    value={qrPayload}
                    size={280}
                    level="H"
                    includeMargin
                    className="rounded-2xl"
                  />
                ) : (
                  <div className="w-70 h-70 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>

              {/* Progress Bar for countdown */}
              <div className="w-full max-w-xs mt-6">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dynamic Rotating Code</span>
                  </span>
                  <span className="font-mono text-indigo-600 font-bold">{countdown}s</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Live Attendance Stats & Recent Scans */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Progress Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Live Attendance</h3>
                </div>
                <Badge variant="primary">{percentage}% Checked In</Badge>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {scannedCount}
                </span>
                <span className="text-sm text-slate-500 font-semibold">
                  / {totalEnrolled} Enrolled Students
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-100 text-center">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <div className="text-xl font-extrabold text-emerald-700">{scannedCount}</div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Present / Late</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xl font-extrabold text-slate-700">
                    {Math.max(0, totalEnrolled - scannedCount)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Not Yet Scanned</div>
                </div>
              </div>
            </Card>

            {/* Live Attendee Stream */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Check-Ins
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Auto-updating</span>
              </div>

              {recentAttendees.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-1.5 opacity-60" />
                  <p className="text-xs font-medium">Waiting for first student scan...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {recentAttendees.map((item, idx) => (
                    <div
                      key={item.student?.id || idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs transition-all hover:bg-slate-100/70"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          {item.student?.name ? item.student.name.charAt(0) : "S"}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="font-bold text-slate-800 truncate">
                            {item.student?.name || "Student"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {item.student?.identifier_number || "ID"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-700 capitalize">
                          {item.status}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Close Session */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Close Attendance Session?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Students who have not scanned will automatically be recorded as{" "}
                <span className="font-bold text-rose-600">Absent</span>. You can still manually adjust attendance records afterward.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Present / Late:</span>
                <span className="font-bold text-emerald-600">{scannedCount} students</span>
              </div>
              <div className="flex justify-between">
                <span>Will be marked Absent:</span>
                <span className="font-bold text-rose-600">
                  {Math.max(0, totalEnrolled - scannedCount)} students
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCloseModal(false)}
                disabled={isClosing}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleCloseSession}
                isLoading={isClosing}
              >
                Confirm & Close Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
