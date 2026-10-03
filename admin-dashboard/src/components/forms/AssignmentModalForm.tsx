"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ClassRoom, Subject, User } from "@/types";

interface AssignmentModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  subjects: Subject[];
  teachers: User[];
  onSubmitTeacherAssignment: (data: {
    class_room_id: number;
    subject_id: number;
    teacher_id: number;
    schedule_day?: string;
    start_time?: string;
    end_time?: string;
    room?: string;
  }) => Promise<void>;
}

export const AssignmentModalForm: React.FC<AssignmentModalFormProps> = ({
  isOpen,
  onClose,
  classes,
  subjects,
  teachers,
  onSubmitTeacherAssignment,
}) => {
  const [classRoomId, setClassRoomId] = useState<number>(
    classes[0]?.id || 0
  );
  const [subjectId, setSubjectId] = useState<number>(
    subjects[0]?.id || 0
  );
  const [teacherId, setTeacherId] = useState<number>(
    teachers[0]?.id || 0
  );
  const [scheduleDay, setScheduleDay] = useState("Monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [room, setRoom] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classRoomId || !subjectId || !teacherId) {
      setError("Please select a class, subject, and teacher.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await onSubmitTeacherAssignment({
        class_room_id: Number(classRoomId),
        subject_id: Number(subjectId),
        teacher_id: Number(teacherId),
        schedule_day: scheduleDay,
        start_time: startTime,
        end_time: endTime,
        room: room || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to save assignment. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Teacher to Subject"
      description="Connect a teacher to instruct a subject for a specific class cohort."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}

        <Select
          label="Target Class"
          value={classRoomId}
          onChange={(e) => setClassRoomId(Number(e.target.value))}
          options={classes.map((c) => ({
            label: `${c.name} (${c.code})`,
            value: c.id,
          }))}
        />

        <Select
          label="Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(Number(e.target.value))}
          options={subjects.map((s) => ({
            label: `${s.name} (${s.code})`,
            value: s.id,
          }))}
        />

        <Select
          label="Assigned Teacher"
          value={teacherId}
          onChange={(e) => setTeacherId(Number(e.target.value))}
          options={teachers.map((t) => ({
            label: `${t.name} (${t.email})`,
            value: t.id,
          }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Schedule Day"
            value={scheduleDay}
            onChange={(e) => setScheduleDay(e.target.value)}
            options={[
              { label: "Monday", value: "Monday" },
              { label: "Tuesday", value: "Tuesday" },
              { label: "Wednesday", value: "Wednesday" },
              { label: "Thursday", value: "Thursday" },
              { label: "Friday", value: "Friday" },
              { label: "Saturday", value: "Saturday" },
            ]}
          />

          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />

          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <Input
          label="Assigned Room / Lab (optional)"
          placeholder="e.g. Lab B-02 or Hall 3"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Confirm Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
