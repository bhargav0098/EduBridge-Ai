import api from './api';

export interface ClassSession {
  id: string;
  name: string;
  subject: string;
  studentCount: number;
  schedule: string;
  attendanceRate: number;
}

export interface StudentAttendance {
  id: string;
  name: string;
  email: string;
  attendanceRate: number;
  status: 'Present' | 'Absent';
  history: { date: string; status: 'Present' | 'Absent' }[];
  quizPerformance: number; // avg quiz score
  notesActivityCount: number;
}

export interface SubjectAttendance {
  subject: string;
  attendanceRate: number;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
}

export interface StudentAttendanceSummary {
  overallRate: number;
  history: { date: string; status: 'Present' | 'Absent' | 'Holiday' }[];
  subjectWise: SubjectAttendance[];
}

export const attendanceService = {
  getClasses: async (): Promise<ClassSession[]> => {
    const response = await api.get('/attendance/classes');
    return response.data;
  },

  getStudents: async (classId?: string): Promise<StudentAttendance[]> => {
    const response = await api.get('/attendance/students', { params: { classId } });
    return response.data;
  },

  markAttendance: async (classId: string, attendanceData: { studentId: string; status: 'Present' | 'Absent' }[], date?: string) => {
    const response = await api.post('/attendance/mark', { classId, date, attendance: attendanceData });
    return response.data;
  },

  getStudentSummary: async (): Promise<StudentAttendanceSummary> => {
    const response = await api.get('/attendance/student/summary');
    return response.data;
  },

  uploadMaterial: async (classId: string, title: string, fileData: string) => {
    const response = await api.post('/classes/material', { classId, title, fileData });
    return response.data;
  }
};
