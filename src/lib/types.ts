export type Role = 'admin' | 'teacher' | 'parent' | 'staff';

export interface Profile {
  id: string;
  school_id: string | null;
  role: Role;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
}

export interface Student {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  date_of_birth?: string | null;
  photo_url?: string | null;
  allergies?: string | null;
  medical_notes?: string | null;
  emergency_contact?: any;
  active?: boolean;
}

export interface GradeCategory {
  id: string;
  class_id: string;
  name: string;
  weight: number;
  drop_lowest: number;
}

export interface Assignment {
  id: string;
  class_id: string;
  category_id: string | null;
  title: string;
  max_points: number;
  due_date?: string | null;
  is_extra_credit: boolean;
  description?: string | null;
}

export interface Grade {
  id?: string;
  assignment_id: string;
  student_id: string;
  score: number | null;
  is_missing: boolean;
  is_late?: boolean;
  comments?: string | null;
  entered_by?: string | null;
  entered_at?: string | null;
}

export interface BreakdownItem {
  name: string;
  weight: number;
  average: number | null;
  contribution: number | null;
  count: number;
  dropped: number;
  assignments?: {
    title: string;
    score: number | null;
    max: number;
    pct: number;
    missing: boolean;
    extra: boolean;
    dropped?: boolean;
  }[];
}

export interface TransparentResult {
  overall: number | null;
  letter: string | null;
  breakdown: BreakdownItem[];
  formula: string;
  missingCount: number;
}
