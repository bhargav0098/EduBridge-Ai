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
    try {
      const response = await api.get('/attendance/classes');
      return response.data;
    } catch (error) {
      console.warn('Using mock classes data', error);
      return [
        { id: 'c1', name: 'CS-3A', subject: 'Data Structures', studentCount: 44, schedule: 'Mon/Thu/Fri 9:00 AM', attendanceRate: 88 },
        { id: 'c2', name: 'CS-3B', subject: 'Mathematics', studentCount: 40, schedule: 'Tue/Thu 1:00 PM', attendanceRate: 75 },
        { id: 'c3', name: 'CS-4A', subject: 'English Literature', studentCount: 38, schedule: 'Tue/Fri 1:00 PM', attendanceRate: 69 },
      ];
    }
  },

  getStudents: async (classId?: string): Promise<StudentAttendance[]> => {
    try {
      const response = await api.get('/attendance/students', { params: { classId } });
      return response.data;
    } catch (error) {
      console.warn('Using mock students data', error);
      // Return default list of mock students
      return [
        {
          id: 's1',
          name: 'Arya Sharma',
          email: 'arya@edu.ai',
          attendanceRate: 92,
          status: 'Present',
          quizPerformance: 85,
          notesActivityCount: 14,
          history: Array.from({ length: 30 }, (_, i) => ({
            date: `2026-05-${String(i + 1).padStart(2, '0')}`,
            status: Math.random() > 0.1 ? 'Present' : 'Absent',
          })),
        },
        {
          id: 's2',
          name: 'Priya Singh',
          email: 'priya@edu.ai',
          attendanceRate: 62,
          status: 'Absent',
          quizPerformance: 54,
          notesActivityCount: 4,
          history: Array.from({ length: 30 }, (_, i) => ({
            date: `2026-05-${String(i + 1).padStart(2, '0')}`,
            status: Math.random() > 0.38 ? 'Present' : 'Absent',
          })),
        },
        {
          id: 's3',
          name: 'Arjun Kaur',
          email: 'arjun@edu.ai',
          attendanceRate: 71,
          status: 'Present',
          quizPerformance: 48,
          notesActivityCount: 6,
          history: Array.from({ length: 30 }, (_, i) => ({
            date: `2026-05-${String(i + 1).padStart(2, '0')}`,
            status: Math.random() > 0.29 ? 'Present' : 'Absent',
          })),
        },
        {
          id: 's4',
          name: 'Suraj Mishra',
          email: 'suraj@edu.ai',
          attendanceRate: 58,
          status: 'Absent',
          quizPerformance: 51,
          notesActivityCount: 3,
          history: Array.from({ length: 30 }, (_, i) => ({
            date: `2026-05-${String(i + 1).padStart(2, '0')}`,
            status: Math.random() > 0.42 ? 'Present' : 'Absent',
          })),
        },
      ];
    }
  },

  markAttendance: async (classId: string, attendanceData: { studentId: string; status: 'Present' | 'Absent' }[], date?: string) => {
    // Post to /api/attendance/mark
    const response = await api.post('/attendance/mark', { classId, date, attendance: attendanceData });
    return response.data;
  },

  getStudentSummary: async (): Promise<StudentAttendanceSummary> => {
    try {
      const response = await api.get('/attendance/student/summary');
      return response.data;
    } catch (error) {
      console.warn('Using mock student attendance summary', error);
      
      const history: { date: string; status: 'Present' | 'Absent' | 'Holiday' }[] = [];
      const baseDate = new Date();
      // Generate 31 days for current month/past month
      for (let i = 30; i >= 0; i--) {
        const d = new Date();
        d.setDate(baseDate.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        if (d.getDay() === 0) {
          history.push({ date: dateStr, status: 'Holiday' });
        } else {
          // Fixed seeds for Physics/other classes to ensure Physics gets 68%
          // and we get some consistent absent patterns
          const isAbsent = i % 5 === 0 || i % 7 === 0;
          history.push({
            date: dateStr,
            status: isAbsent ? 'Absent' : 'Present'
          });
        }
      }

      return {
        overallRate: 78,
        history,
        subjectWise: [
          { subject: 'Physics', attendanceRate: 68, totalClasses: 25, presentClasses: 17, absentClasses: 8 },
          { subject: 'Chemistry', attendanceRate: 80, totalClasses: 25, presentClasses: 20, absentClasses: 5 },
          { subject: 'Math', attendanceRate: 88, totalClasses: 30, presentClasses: 26, absentClasses: 4 },
          { subject: 'Data Structures', attendanceRate: 84, totalClasses: 30, presentClasses: 25, absentClasses: 5 },
          { subject: 'English', attendanceRate: 90, totalClasses: 20, presentClasses: 18, absentClasses: 2 }
        ]
      };
    }
  },

  uploadMaterial: async (classId: string, title: string, fileData: string) => {
    const response = await api.post('/classes/material', { classId, title, fileData });
    return response.data;
  }
};
