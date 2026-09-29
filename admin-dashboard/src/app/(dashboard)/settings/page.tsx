"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, QrCode, Clock, MapPin, Save, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [qrRotationInterval, setQrRotationInterval] = useState("15");
  const [lateThreshold, setLateThreshold] = useState("15");
  const [defaultRadius, setDefaultRadius] = useState("50");
  const [allowLateCheckin, setAllowLateCheckin] = useState("true");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          System Parameters & Policies
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure dynamic QR code security parameters, grace period thresholds, and institutional rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dynamic QR Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Dynamic HMAC QR Code Engine</CardTitle>
                <CardDescription>
                  Prevent attendance fraud, photo sharing, and screen capture replays.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Select
              label="QR Token Refresh Interval (Seconds)"
              value={qrRotationInterval}
              onChange={(e) => setQrRotationInterval(e.target.value)}
              options={[
                { label: "10 Seconds (Maximum Security)", value: "10" },
                { label: "15 Seconds (Recommended)", value: "15" },
                { label: "30 Seconds (Standard)", value: "30" },
                { label: "60 Seconds (Relaxed)", value: "60" },
              ]}
            />

            <Select
              label="Time-step Window Tolerance"
              defaultValue="1"
              options={[
                { label: "Current & Previous Window (Tolerate network latency)", value: "1" },
                { label: "Strict Current Window Only", value: "0" },
              ]}
            />
          </div>
        </Card>

        {/* Lateness & Grace Period */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Lateness & Grace Period Policies</CardTitle>
                <CardDescription>
                  Define rules for marking students late vs unexcused absent.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Late Threshold (Minutes after lecture start)"
              type="number"
              min={0}
              max={120}
              value={lateThreshold}
              onChange={(e) => setLateThreshold(e.target.value)}
              helperText="Scans recorded after this time will be flagged as Late."
            />

            <Select
              label="Allow Late Check-in"
              value={allowLateCheckin}
              onChange={(e) => setAllowLateCheckin(e.target.value)}
              options={[
                { label: "Enabled (Accept late check-ins)", value: "true" },
                { label: "Disabled (Reject scans after cutoff)", value: "false" },
              ]}
            />
          </div>
        </Card>

        {/* Geofence & Institution Defaults */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Academic & Institution Settings</CardTitle>
                <CardDescription>
                  Default parameters applied across newly created sessions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Active Academic Year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />

            <Input
              label="Default Classroom Geofence Radius (Meters)"
              type="number"
              min={10}
              max={5000}
              value={defaultRadius}
              onChange={(e) => setDefaultRadius(e.target.value)}
              helperText="Used if GPS geofencing verification is enabled for a session."
            />
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Check className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </div>
          ) : (
            <div />
          )}

          <Button type="submit" size="lg">
            <Save className="w-4 h-4 mr-2" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
