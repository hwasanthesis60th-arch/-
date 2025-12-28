
export type Achievement = 'A' | 'B' | 'C' | 'D' | 'E' | 'P' | '-';

export interface SubjectGrade {
  name: string;
  midterm?: number;
  final?: number;
  performance?: number;
  perfA?: number; // 0-8
  perfB?: number; // 0-8
  perfC?: number; // 0-8
  perfD?: number; // 0-8
  paperTest?: number;
  rawScore: number | '-';
  achievement: Achievement;
}

export interface SemesterData {
  isFreeSemester: boolean;
  subjects: SubjectGrade[];
}

export interface NonAcademicData {
  attendance: {
    absences: [number, number, number]; // Grade 1, 2, 3
    tardies: [number, number, number];
    earlyLeaves: [number, number, number];
    results: [number, number, number];
  };
  volunteer: {
    hours: number;
    specialCase: 'none' | '30h' | '20h' | 'disabled';
  };
  behavior: {
    grade1: { base: number; extra: number }; // Max extra 2.0 (0.5 each)
    grade2: { base: number; extra: number };
    grade3: { base: number; extra: number };
  };
}

export interface UserProfile {
  id: string;
  username: string;
  semesters: Record<string, SemesterData>;
  nonAcademic: NonAcademicData;
  bookmarks: string[]; // High school IDs
}

export interface HighSchool {
  id: string;
  name: string;
  imageUrl: string;
  type: string;
  location: string;
  eligibility: string;
  description: string;
  progressionRate: string;
}
