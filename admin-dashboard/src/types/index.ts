export type UserRole = 'admin' | 'teacher' | 'mazer' | 'student';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  identifier_number?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  advised_class_rooms?: ClassRoom[];
  taught_class_subjects?: ClassSubject[];
}

export interface ClassRoom {
  id: number;
  name: string;
  code: string;
  academic_year: string;
  grade_level?: string | null;
  room_number?: string | null;
  mazer_id?: number | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  mazer?: User | null;
  students_count?: number;
  class_subjects_count?: number;
  students?: User[];
  class_subjects?: ClassSubject[];
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  credit_hours: number;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  class_subjects_count?: number;
  class_subjects?: ClassSubject[];
}

export interface ClassSubject {
  id: number;
  class_room_id: number;
  subject_id: number;
  teacher_id: number;
  schedule_day?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  class_room?: ClassRoom;
  subject?: Subject;
  teacher?: User;
}

export interface Enrollment {
  id: number;
  student_id: number;
  class_room_id: number;
  academic_year: string;
  status: 'active' | 'transferred' | 'graduated' | 'dropped';
  enrolled_at?: string;
  student?: User;
  class_room?: ClassRoom;
}

export interface AttendanceSession {
  id: number;
  class_subject_id: number;
  teacher_id: number;
  session_date: string;
  title?: string | null;
  start_time: string;
  end_time?: string | null;
  expires_at?: string | null;
  status: 'active' | 'closed' | 'expired';
  qr_secret: string;
  qr_refresh_seconds: number;
  allow_late: boolean;
  late_threshold_minutes: number;
  room?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  notes?: string | null;
  class_subject?: ClassSubject;
  teacher?: User;
  attendance_records_count?: number;
  present_count?: number;
}

export interface AttendanceRecord {
  id: number;
  attendance_session_id: number;
  student_id: number;
  status: 'present' | 'late' | 'absent' | 'excused';
  scanned_at?: string | null;
  method: 'qr_scan' | 'manual_teacher' | 'manual_mazer' | 'admin_override';
  device_info?: string | null;
  ip_address?: string | null;
  remarks?: string | null;
  student?: User;
  attendance_session?: AttendanceSession;
}

export interface LeaveRequest {
  id: number;
  student_id: number;
  class_room_id: number;
  attendance_session_id?: number | null;
  subject_id?: number | null;
  leave_type: 'sick' | 'permission' | 'dispensation' | 'correction';
  start_date: string;
  end_date: string;
  reason: string;
  attachment_path?: string | null;
  status: 'pending_mazer' | 'pending_teacher' | 'approved' | 'rejected';
  mazer_approval: 'pending' | 'approved' | 'rejected';
  mazer_approved_by?: number | null;
  teacher_approval: 'pending' | 'approved' | 'rejected';
  student?: User;
  class_room?: ClassRoom;
  subject?: Subject;
}

export interface SystemStats {
  students: number;
  teachers: number;
  mazers: number;
  classes: number;
  subjects: number;
  active_sessions: number;
}

export interface DashboardOverviewData {
  counts: SystemStats;
  today: {
    attendance_rate: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    total_marks: number;
  };
  attendance_trend: Array<{
    date: string;
    day: string;
    present: number;
    absent: number;
    excused: number;
    rate: number;
  }>;
}
