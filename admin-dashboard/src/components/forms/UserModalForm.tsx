"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { User, UserRole } from "@/types";

interface UserModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: Partial<User> & { password?: string }) => Promise<void>;
  initialData?: User | null;
}

export const UserModalForm: React.FC<UserModalFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [identifierNumber, setIdentifierNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setRole(initialData.role || "student");
      setIdentifierNumber(initialData.identifier_number || "");
      setPhone(initialData.phone || "");
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setRole("student");
      setIdentifierNumber("");
      setPhone("");
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload: Partial<User> & { password?: string } = {
        name,
        email,
        role,
        identifier_number: identifierNumber || null,
        phone: phone || null,
      };

      if (password) {
        payload.password = password;
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to save user. Please check form values."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!initialData;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit User Account" : "Create New User"}
      description={
        isEditing
          ? "Update details, credentials, or role permissions."
          : "Register a new student, teacher, mazer, or administrator."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Doe"
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@attendance.com"
          required
        />

        <Input
          label={isEditing ? "Password (leave blank to keep current)" : "Password"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required={!isEditing}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { label: "Student", value: "student" },
              { label: "Teacher", value: "teacher" },
              { label: "Mazer (Class Advisor)", value: "mazer" },
              { label: "Administrator", value: "admin" },
            ]}
          />

          <Input
            label="Student ID / Staff Code"
            value={identifierNumber}
            onChange={(e) => setIdentifierNumber(e.target.value)}
            placeholder="e.g. STU-2026-001"
          />
        </div>

        <Input
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
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
            {isEditing ? "Save Changes" : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
