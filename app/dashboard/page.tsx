'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { attendanceService, ClassSession, StudentAttendance, StudentAttendanceSummary } from '@/services/attendance';
import api from '@/services/api';
import { toast, Toaster } from 'react-hot-toast';

const progressData = [
  { name: 'Mon', score: 75 },
  { name: 'Tue', score: 82 },
  { name: 'Wed', score: 88 },
  { name: 'Thu', score: 85 },
  { name: 'Fri', score: 92 },
  { name: 'Sat', score: 89 },
  { name: 'Sun', score: 95 },
];

const subjectData = [
  { name: 'Math', value: 85 },
  { name: 'Science', value: 78 },
  { name: 'English', value: 88 },
  { name: 'History', value: 82 },
];

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background text-text-primary tech-grid justify-center items-center">
        <div className="text-lg font-bold">Loading Dashboard...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get('tab') : null;

  // Auth guard — redirect unauthenticated users to login
  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        if (!useAuthStore.getState().user) {
          router.replace('/login');
        }
      }, 300);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  // Role is locked to the signed-in user's role — no manual toggle
  const currentRole: 'student' | 'teacher' = user?.role === 'teacher' ? 'teacher' : 'student';
  const [teacherTab, setTeacherTab] = useState<'home' | 'classes' | 'attendance' | 'students' | 'upload'>('home');
  const [studentTab, setStudentTab] = useState<'overview' | 'attendance'>('overview');
  const [studentSummary, setStudentSummary] = useState<StudentAttendanceSummary | null>(null);

  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);
  const [isManageClassesOpen, setIsManageClassesOpen] = useState<boolean>(false);

  const fetchStudentProfile = async () => {
    try {
      const res = await api.get('/attendance/student/profile');
      if (res.data && res.data.class_name) {
        const classesList = res.data.class_name
          .split(',')
          .map((c: string) => c.trim())
          .filter(Boolean);
        setEnrolledClasses(classesList);
      }
    } catch (err) {
      console.error('Error fetching student profile:', err);
    }
  };

  const handleSaveClasses = async (selected: string[]) => {
    try {
      const classNameStr = selected.join(',');
      await api.post('/attendance/student/profile', { class_name: classNameStr });
      setEnrolledClasses(selected);
      toast.success('Enrolled classes updated successfully!');
      setIsManageClassesOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update enrolled classes.');
      console.error('Enrollment API error:', err);
    }
    
    try {
      const summary = await attendanceService.getStudentSummary();
      setStudentSummary(summary);
    } catch (err: any) {
      console.error('Failed to fetch updated student summary:', err);
    }
  };

  useEffect(() => {
    if (currentRole === 'teacher') {
      if (tabParam && ['home', 'classes', 'attendance', 'students', 'upload'].includes(tabParam)) {
        setTeacherTab(tabParam as any);
      } else {
        setTeacherTab('home');
      }
    } else {
      if (tabParam && ['overview', 'attendance'].includes(tabParam)) {
        setStudentTab(tabParam as any);
      } else {
        setStudentTab('overview');
      }
    }
  }, [tabParam, currentRole]);

  const handleTabChange = (tab: 'home' | 'classes' | 'attendance' | 'students' | 'upload') => {
    setTeacherTab(tab);
    router.push(tab === 'home' ? '/dashboard' : `/dashboard?tab=${tab}`);
  };

  const handleStudentTabChange = (tab: 'overview' | 'attendance') => {
    setStudentTab(tab);
    router.push(tab === 'overview' ? '/dashboard' : `/dashboard?tab=${tab}`);
  };

  // Date and Export States
  const [attendanceDate, setAttendanceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [exportStartDate, setExportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Teacher Data States
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [markingClassId, setMarkingClassId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);

  // Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [minAttendanceFilter, setMinAttendanceFilter] = useState<number>(0);

  // Material Upload State
  const [uploadClassId, setUploadClassId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Student & Teacher stats
  const [stats, setStats] = useState({
    attendance: '0%',
    quizScore: '0/100',
    learningStreak: '0 days',
    achievementCount: 0,
  });

  const [achievements, setAchievements] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]); // for teacher grading
  const [doubts, setDoubts] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  // Form states
  const [newDoubtContent, setNewDoubtContent] = useState('');
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newAssignmentDesc, setNewAssignmentDesc] = useState('');
  const [newAssignmentDueDate, setNewAssignmentDueDate] = useState('');
  const [newAssignmentClass, setNewAssignmentClass] = useState('c1');
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  const [resolvingDoubtId, setResolvingDoubtId] = useState<number | null>(null);
  const [doubtResponseText, setDoubtResponseText] = useState('');
  const [isResolvingDoubt, setIsResolvingDoubt] = useState(false);

  const [gradingSubmissionId, setGradingSubmissionId] = useState<number | null>(null);
  const [gradeText, setGradeText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [isGradingSubmission, setIsGradingSubmission] = useState(false);

  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<number | null>(null);
  const [submissionContentText, setSubmissionContentText] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const [upcomingEvents, setUpcomingEvents] = useState([
    { id: 1, title: 'Physics Quiz', time: 'Today at 2:00 PM', status: 'upcoming' },
    { id: 2, title: 'Chemistry Lab', time: 'Tomorrow at 10:00 AM', status: 'upcoming' },
    { id: 3, title: 'English Essay', time: 'June 6 at 4:00 PM', status: 'upcoming' },
  ]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (currentRole === 'student') {
        setStats({
          attendance: `${res.data.attendance_percentage}%`,
          quizScore: `${res.data.quiz_accuracy}/100`,
          learningStreak: `${res.data.streak} days`,
          achievementCount: res.data.achievement_count,
        });
        setAchievements(res.data.achievements || []);
      } else {
        setStats({
          attendance: `${res.data.total_students} Students`,
          quizScore: `${res.data.total_assignments_created} Tasks`,
          learningStreak: `${res.data.pending_grading} Ungraded`,
          achievementCount: res.data.open_doubts,
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await api.get('/dashboard/timeline');
      setTimeline(res.data || []);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      if (currentRole === 'student') {
        const res = await api.get('/assignments/student');
        setAssignments(res.data || []);
      } else {
        const res = await api.get('/assignments/submissions');
        setSubmissions(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchDoubts = async () => {
    try {
      const res = await api.get('/doubts/');
      setDoubts(res.data || []);
    } catch (err) {
      console.error('Error fetching doubts:', err);
    }
  };

  // Submit Assignment (student)
  const handleSubmitAssignmentContent = async (submissionId: number) => {
    if (!submissionContentText.trim()) {
      toast.error('Submission content cannot be empty.');
      return;
    }
    setIsSubmittingAssignment(true);
    try {
      await api.post(`/assignments/submit/${submissionId}`, {
        submission_content: submissionContentText,
      });
      toast.success('Assignment submitted successfully!');
      setSubmittingAssignmentId(null);
      setSubmissionContentText('');
      fetchAssignments();
      fetchTimeline();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit assignment.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  // Grade Submission (teacher)
  const handleGradeSubmissionSubmit = async (submissionId: number) => {
    if (!gradeText.trim()) {
      toast.error('Grade is required.');
      return;
    }
    setIsGradingSubmission(true);
    try {
      await api.post(`/assignments/grade/${submissionId}`, {
        grade: gradeText,
        feedback: feedbackText,
      });
      toast.success('Submission graded successfully!');
      setGradingSubmissionId(null);
      setGradeText('');
      setFeedbackText('');
      fetchAssignments();
      fetchTimeline();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to grade submission.');
    } finally {
      setIsGradingSubmission(false);
    }
  };

  // Ask Doubt (student)
  const handleAskDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoubtContent.trim()) {
      toast.error('Doubt content cannot be empty.');
      return;
    }
    try {
      await api.post('/doubts/', {
        content: newDoubtContent,
      });
      toast.success('Doubt submitted successfully!');
      setNewDoubtContent('');
      fetchDoubts();
      fetchTimeline();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit doubt.');
    }
  };

  // Resolve Doubt (teacher)
  const handleResolveDoubtSubmit = async (doubtId: number) => {
    if (!doubtResponseText.trim()) {
      toast.error('Response cannot be empty.');
      return;
    }
    setIsResolvingDoubt(true);
    try {
      await api.post(`/doubts/resolve/${doubtId}`, {
        response: doubtResponseText,
      });
      toast.success('Doubt resolved successfully!');
      setResolvingDoubtId(null);
      setDoubtResponseText('');
      fetchDoubts();
      fetchTimeline();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resolve doubt.');
    } finally {
      setIsResolvingDoubt(false);
    }
  };

  // Create Assignment (teacher)
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignmentTitle.trim() || !newAssignmentDueDate) {
      toast.error('Title and Due Date are required.');
      return;
    }
    setIsCreatingAssignment(true);
    try {
      await api.post('/assignments/', {
        title: newAssignmentTitle,
        description: newAssignmentDesc,
        due_date: new Date(newAssignmentDueDate).toISOString(),
        class_id: newAssignmentClass,
      });
      toast.success('Assignment created successfully!');
      setNewAssignmentTitle('');
      setNewAssignmentDesc('');
      setNewAssignmentDueDate('');
      fetchAssignments();
      fetchTimeline();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create assignment.');
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      if (currentRole === 'teacher') {
        const classList = await attendanceService.getClasses();
        setClasses(classList);
        if (classList.length > 0) {
          setMarkingClassId(classList[0].id);
          setUploadClassId(classList[0].id);
          setNewAssignmentClass(classList[0].id);
        }
        const studentList = await attendanceService.getStudents();
        setStudents(studentList);

        // Prepopulate attendance records
        const initialRecords: Record<string, 'Present' | 'Absent'> = {};
        studentList.forEach(s => {
          initialRecords[s.id] = s.status;
        });
        setAttendanceRecords(initialRecords);
      } else if (currentRole === 'student') {
        const summary = await attendanceService.getStudentSummary();
        setStudentSummary(summary);
        await fetchStudentProfile();
      }

      await Promise.all([
        fetchStats(),
        fetchTimeline(),
        fetchAssignments(),
        fetchDoubts()
      ]);
    };

    loadData();

    // SSE connection
    let eventSource: EventSource | null = null;
    try {
      const raw = localStorage.getItem('auth-storage');
      const token = raw ? JSON.parse(raw)?.state?.token : null;
      if (token) {
        eventSource = new EventSource(`/api/dashboard/stream?token=${token}`);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('SSE Event received:', data);
            
            if (data.event === 'assignment_created' || data.event === 'assignment_submitted' || data.event === 'assignment_graded') {
              fetchAssignments();
              fetchStats();
              fetchTimeline();
              toast.success(`Activity Update: ${data.title || 'Assignment updated'}!`);
            } else if (data.event === 'doubt_created' || data.event === 'doubt_resolved') {
              fetchDoubts();
              fetchStats();
              fetchTimeline();
              toast.success(`Doubt Update: ${data.event === 'doubt_created' ? 'New doubt asked' : 'Doubt resolved'}!`);
            } else if (data.event === 'attendance_marked') {
              fetchStats();
              fetchTimeline();
              toast.success('Attendance updated!');
            } else if (data.event === 'quiz_completed') {
              fetchStats();
              fetchTimeline();
              toast.success(`${data.student_name} finished a quiz in ${data.subject}!`);
            }
          } catch (e) {
            console.error('Failed to parse SSE data', e);
          }
        };

        eventSource.onerror = (err) => {
          console.warn('SSE connection closed or error:', err);
        };
      }
    } catch (err) {
      console.error('Error establishing SSE connection:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentRole, user]);

  // Handle Attendance toggle
  const toggleAttendance = (studentId: string) => {
    setAttendanceRecords((prev: Record<string, 'Present' | 'Absent'>) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  // Submit Attendance
  const handleSubmitAttendance = async () => {
    if (!markingClassId) {
      toast.error('Please select a class session.');
      return;
    }
    setIsSubmittingAttendance(true);
    try {
      const recordsArray = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        studentId,
        status: status as 'Present' | 'Absent'
      }));
      await attendanceService.markAttendance(markingClassId, recordsArray, attendanceDate);
      toast.success('Attendance records submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit attendance records.');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Export CSV Report
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/attendance/export', {
        params: {
          classId: markingClassId,
          startDate: exportStartDate,
          endDate: exportEndDate
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${markingClassId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV Exported successfully!');
    } catch (err) {
      console.warn('API export failed, generating local fallback CSV', err);
      const headers = ["Student Name", "Email", "Status", "Date Range"];
      const rows = students.map((s: StudentAttendance) => [
        s.name,
        s.email,
        attendanceRecords[s.id] || 'Present',
        `${exportStartDate} to ${exportEndDate}`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(r => r.map(val => `"${val}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `attendance_export_${exportStartDate}_to_${exportEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV Exported (Local Fallback) successfully!');
    }
  };

  // Upload Material
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClassId || !uploadTitle || !uploadContent) {
      toast.error('Please fill in all fields.');
      return;
    }
    setIsUploading(true);
    try {
      await attendanceService.uploadMaterial(uploadClassId, uploadTitle, uploadContent);
      toast.success('Study notes uploaded to class feed successfully!');
      setUploadTitle('');
      setUploadContent('');
    } catch (err) {
      toast.error('Failed to upload materials.');
    } finally {
      setIsUploading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: 'easeOut' as const },
    },
  };

  // Convert timeline activities to chart data points
  const chartData = timeline
    .filter(log => log.role === 'student' && log.user_id === user?.id)
    .slice()
    .reverse()
    .map((log, index) => {
      let score = 50;
      if (log.action_type === 'quiz_attempt') {
        score = log.metadata_json?.correct ? 95 : 45;
      } else if (log.action_type === 'assignment_submitted') {
        score = 85;
      } else if (log.action_type === 'attendance_marked') {
        score = log.metadata_json?.status === 'present' ? 98 : 35;
      } else if (log.action_type === 'doubt_asked') {
        score = 65;
      }
      return {
        name: `Act ${index + 1}`,
        score: score,
        action: log.action_type
      };
    });
  const finalChartData = chartData.length > 0 ? chartData.slice(-7) : progressData;

  // Filtered student list
  const filteredStudents = students.filter((s: StudentAttendance) => {
    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          s.email.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesAttendance = s.attendanceRate >= minAttendanceFilter;
    return matchesSearch && matchesAttendance;
  });

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        {/* Role-locked header bar with contextual tabs */}
        <div className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-border px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          {/* Read-only role badge */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/60 dark:text-primary-light/60 font-mono">Signed in as:</span>
            <div className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
              currentRole === 'teacher'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/20'
            }`}>
              {currentRole === 'teacher' ? '🎓 Teacher' : '📖 Student'}
            </div>
          </div>

          {/* Student tabs */}
          {currentRole === 'student' && (
            <div className="flex gap-2">
              {(['overview', 'attendance'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleStudentTabChange(tab)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    studentTab === tab
                      ? 'bg-primary/10 text-primary dark:text-primary-light border border-indigo-500/35 shadow-sm shadow-indigo-500/10'
                      : 'bg-transparent text-text-secondary/40 hover:text-text-secondary/70 border border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Teacher tabs */}
          {currentRole === 'teacher' && (
            <div className="flex gap-2">
              {(['home', 'classes', 'attendance', 'students', 'upload'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    teacherTab === tab
                      ? 'bg-primary/10 text-primary dark:text-purple-300 border border-primary/35 shadow-sm shadow-primary/10'
                      : 'bg-transparent text-text-secondary/40 hover:text-text-secondary/70 border border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          
          {/* STUDENT DASHBOARD VIEW */}
          {currentRole === 'student' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
              {studentTab === 'overview' ? (
                <>
                  <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-white">Welcome Back, {user?.name || 'Student'}! 👋</h1>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <p className="text-gray-600 dark:text-text-muted font-bold text-sm">Here's your learning progress today</p>
                        {enrolledClasses.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <span className="text-gray-400 font-mono text-xs">• Enrolled in:</span>
                            {enrolledClasses.map(c => (
                              <span key={c} className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsManageClassesOpen(true)}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center gap-2 border border-white/10"
                    >
                      <span>🏫</span> Manage Classes
                    </button>
                  </div>

                  {/* Stats Cards */}
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div variants={itemVariants}>
                      <Card title="Attendance" value={stats.attendance} icon="📚" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <Card title="Quiz Score" value={stats.quizScore} icon="⭐" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <Card title="Learning Streak" value={stats.learningStreak} icon="🔥" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <Card title="Achievements" value={`${stats.achievementCount} Badges`} icon="🏆" />
                    </motion.div>
                  </motion.div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Progress Chart */}
                    <motion.div
                       className="bg-surface border border-border rounded-2xl shadow-lg p-6 backdrop-blur-sm relative overflow-hidden"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.22 }}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
                      <h2 className="text-xs font-bold mb-6 text-primary-light/60 uppercase tracking-wider font-mono">Weekly Progress</h2>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={finalChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                backdropFilter: 'blur(10px)',
                                fontSize: '12px',
                                fontFamily: 'monospace'
                              }}
                              itemStyle={{ color: '#6C63FF', fontWeight: 'bold' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#6C63FF"
                              strokeWidth={3}
                              dot={{ fill: '#6C63FF', r: 4, strokeWidth: 0 }}
                              activeDot={{ r: 6, fill: '#fff', stroke: '#6C63FF', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    {/* Subject Performance */}
                    <motion.div
                      className="bg-surface border border-border rounded-2xl shadow-lg p-6 backdrop-blur-sm relative overflow-hidden"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.13, duration: 0.22 }}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none" />
                      <h2 className="text-xs font-bold mb-6 text-primary-light/60 uppercase tracking-wider font-mono">Subject Performance</h2>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                backdropFilter: 'blur(10px)',
                                fontSize: '12px',
                                fontFamily: 'monospace'
                              }}
                              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                            />
                            <Bar dataKey="value" fill="url(#colorSubject)" radius={[4, 4, 0, 0]} />
                            <defs>
                              <linearGradient id="colorSubject" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.2}/>
                              </linearGradient>
                            </defs>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  </div>

                  {/* Quick Actions & Upcoming Events */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <motion.div
                      className="lg:col-span-2 bg-surface border border-border rounded-2xl shadow-lg p-6 backdrop-blur-sm relative overflow-hidden"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.16, duration: 0.22 }}
                    >
                      <h2 className="text-xs font-bold mb-5 text-primary-light/60 uppercase tracking-wider font-mono">Quick Actions</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                        <Link
                          href="/chat"
                          className="bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-primary-light hover:text-white px-4 py-4 rounded-xl font-bold transition-all text-sm flex flex-col items-center gap-2 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">💬</span>
                          <span>Ask AI Tutor</span>
                        </Link>
                        <Link
                          href="/quiz"
                          className="bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-300 hover:text-white px-4 py-4 rounded-xl font-bold transition-all text-sm flex flex-col items-center gap-2 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">📝</span>
                          <span>Take Quiz</span>
                        </Link>
                        <Link
                          href="/resources"
                          className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 px-4 py-4 rounded-xl font-bold transition-all text-sm flex flex-col items-center gap-2 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                          <span>Resources</span>
                        </Link>
                      </div>
                    </motion.div>

                    {/* Upcoming Events */}
                    <motion.div
                      className="bg-surface border border-border rounded-2xl shadow-lg p-6 backdrop-blur-sm relative overflow-hidden"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.22 }}
                    >
                      <h2 className="text-xs font-bold mb-5 text-primary-light/60 uppercase tracking-wider font-mono">Upcoming Events</h2>
                      <div className="space-y-4 relative z-10">
                        {upcomingEvents.map((event) => (
                          <div
                            key={event.id}
                            className="border-l-2 border-indigo-500 bg-surface p-3 rounded-r-xl"
                          >
                            <p className="font-bold text-white text-sm">{event.title}</p>
                            <p className="text-[10px] uppercase tracking-wider font-mono text-primary-light/50 mt-1">{event.time}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Coursework & Assignments Section */}
                  <motion.div
                    className="bg-surface border border-border rounded-2xl shadow-lg p-6 mt-6 backdrop-blur-sm relative overflow-hidden"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.22 }}
                  >
                    <h2 className="text-xs font-bold mb-5 text-primary-light/60 uppercase tracking-wider font-mono">Assigned Tasks & Coursework</h2>
                    <div className="space-y-4">
                      {assignments.length === 0 ? (
                        <p className="text-sm text-text-muted">No assignments assigned yet.</p>
                      ) : (
                        assignments.map((sub: any) => (
                          <div key={sub.id} className="p-4 bg-surface-2 border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white text-sm">{sub.assignment?.title || 'Assignment'}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                                  sub.status === 'graded' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                  sub.status === 'submitted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted mt-1">{sub.assignment?.description}</p>
                              <p className="text-[10px] text-primary-light/60 mt-1 font-mono">Due: {new Date(sub.assignment?.due_date).toLocaleString()}</p>
                              {sub.grade && (
                                <div className="mt-2 text-xs">
                                  <span className="font-bold text-white">Grade:</span> <span className="text-green-400 font-mono font-bold bg-green-500/10 px-1.5 py-0.5 rounded">{sub.grade}</span>
                                  {sub.feedback && <p className="text-text-muted mt-1 italic">"{sub.feedback}"</p>}
                                </div>
                              )}
                            </div>

                            {sub.status === 'assigned' && (
                              <div className="flex-shrink-0">
                                {submittingAssignmentId === sub.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      rows={3}
                                      placeholder="Type your submission content here..."
                                      value={submissionContentText}
                                      onChange={(e) => setSubmissionContentText(e.target.value)}
                                      className="w-full md:w-80 bg-surface border border-border rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => setSubmittingAssignmentId(null)}
                                        className="px-3 py-1 bg-surface-2 border border-border rounded text-[10px] text-white hover:bg-gray-700"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSubmitAssignmentContent(sub.id)}
                                        disabled={isSubmittingAssignment}
                                        className="px-3 py-1 bg-indigo-600 rounded text-[10px] text-white font-bold hover:bg-indigo-700 disabled:bg-gray-500"
                                      >
                                        {isSubmittingAssignment ? 'Submitting...' : 'Submit'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSubmittingAssignmentId(sub.id);
                                      setSubmissionContentText('');
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                                  >
                                    Submit Solution
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Doubts and Questions */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <motion.div
                      className="lg:col-span-1 bg-surface border border-border rounded-2xl shadow-lg p-6 backdrop-blur-sm relative overflow-hidden"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.24, duration: 0.22 }}
                    >
                      <h2 className="text-xs font-bold mb-4 text-primary-light/60 uppercase tracking-wider font-mono">Ask a Doubt</h2>
                      <form onSubmit={handleAskDoubt} className="space-y-4">
                        <textarea
                          rows={4}
                          placeholder="What academic topic or question are you struggling with? Ask here..."
                          value={newDoubtContent}
                          onChange={(e) => setNewDoubtContent(e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                        >
                          Submit Question
                        </button>
                      </form>
                    </motion.div>

                    <motion.div
                      className="lg:col-span-2 bg-surface border border-border rounded-2xl shadow-lg p-6 backdrop-blur-sm relative overflow-hidden"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.26, duration: 0.22 }}
                    >
                      <h2 className="text-xs font-bold mb-4 text-primary-light/60 uppercase tracking-wider font-mono">Your Doubts History</h2>
                      <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                        {doubts.length === 0 ? (
                          <p className="text-xs text-text-muted">No doubts asked yet.</p>
                        ) : (
                          doubts.map((doubt: any) => (
                            <div key={doubt.id} className="p-3.5 bg-surface-2 border border-border rounded-xl">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-semibold text-white">Q: {doubt.content}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                                  doubt.status === 'resolved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {doubt.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-muted mt-1 font-mono">Asked on: {new Date(doubt.created_at).toLocaleString()}</p>
                              {doubt.response && (
                                <div className="mt-3 p-3 bg-surface border-l-2 border-green-500 rounded-r-lg">
                                  <p className="text-xs font-bold text-green-400">Teacher's Answer:</p>
                                  <p className="text-xs text-white mt-1">{doubt.response}</p>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Connection Agent Timeline Feed */}
                  <motion.div
                    className="bg-surface border border-border rounded-2xl shadow-lg p-6 mt-6 backdrop-blur-sm relative overflow-hidden"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.22 }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
                    <h2 className="text-xs font-bold mb-5 text-primary-light/60 uppercase tracking-wider font-mono">Shared Classroom Activity Timeline</h2>
                    <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                      {timeline.length === 0 ? (
                        <p className="text-sm text-text-muted">No classroom activity logged yet.</p>
                      ) : (
                        timeline.map((log: any) => {
                          let icon = '🔄';
                          let text = '';
                          if (log.action_type === 'assignment_created') {
                            icon = '📝';
                            text = `${log.user_name} created assignment: '${log.metadata_json?.assignment_title}'`;
                          } else if (log.action_type === 'assignment_assigned') {
                            icon = '📅';
                            text = `New assignment assigned: '${log.metadata_json?.assignment_title}'`;
                          } else if (log.action_type === 'assignment_submitted') {
                            icon = '📤';
                            text = `${log.user_name} submitted assignment: '${log.metadata_json?.assignment_title}'`;
                          } else if (log.action_type === 'assignment_graded') {
                            icon = '💯';
                            text = `Assignment graded: '${log.metadata_json?.assignment_title}' with score '${log.metadata_json?.grade}'`;
                          } else if (log.action_type === 'doubt_asked') {
                            icon = '❓';
                            text = `${log.user_name} asked a doubt: "${log.metadata_json?.content_preview}"`;
                          } else if (log.action_type === 'doubt_resolved') {
                            icon = '✅';
                            text = `Doubt resolved by teacher: "${log.metadata_json?.question || 'Student doubt'}"`;
                          } else if (log.action_type === 'attendance_marked') {
                            icon = '📋';
                            if (log.role === 'teacher') {
                              text = `Teacher logged attendance for Class ${log.metadata_json?.class_id} (${log.metadata_json?.students_count} students)`;
                            } else {
                              text = `${log.user_name} was marked ${log.metadata_json?.status} in Class ${log.metadata_json?.class_id}`;
                            }
                          } else if (log.action_type === 'quiz_attempt') {
                            icon = log.metadata_json?.correct ? '🔥' : '✏️';
                            text = `${log.user_name} attempted a ${log.metadata_json?.subject} quiz question on ${log.metadata_json?.topic} (${log.metadata_json?.correct ? 'Correct' : 'Incorrect'})`;
                          }
                          
                          return (
                            <div key={log.id} className="flex items-start gap-3 text-xs bg-surface-2/40 border border-border/30 p-2.5 rounded-xl animate-fadeIn">
                              <span className="text-lg">{icon}</span>
                              <div className="flex-1">
                                <p className="text-white font-semibold">{text}</p>
                                <p className="text-[10px] text-text-muted mt-0.5 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white">Attendance Analytics</h1>
                    <p className="text-gray-600 dark:text-text-muted mt-1">Detailed report of your class presence and performance thresholds.</p>
                  </div>

                  {/* Alert banner: 'Your Physics attendance is 68% — below 75% threshold' in amber */}
                  {studentSummary?.subjectWise.some(s => s.subject === 'Physics' && s.attendanceRate < 75) && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-amber-500 text-2xl">⚠️</span>
                        <div>
                          <p className="text-sm text-amber-800 dark:text-amber-300 font-bold">
                            Your Physics attendance is 68% — below 75% threshold
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                            Please contact your professor or attend extra classes to avoid eligibility penalties.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly calendar heatmap (green = present, red = absent, gray = holiday) */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-lg mb-4 text-white">Monthly Attendance Heatmap</h3>
                      
                      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 mb-2">
                        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2">
                        {/* May 2026 starts on Friday: 4 empty spaces */}
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        
                        {studentSummary?.history.map((h, i) => {
                          let colorClass = '';
                          if (h.status === 'Present') colorClass = 'bg-green-500 text-white';
                          else if (h.status === 'Absent') colorClass = 'bg-red-500 text-white';
                          else colorClass = 'bg-gray-300 bg-surface text-gray-600 dark:text-text-muted';
                          
                          return (
                            <div
                              key={h.date}
                              title={`${h.date}: ${h.status}`}
                              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold shadow-sm transition-transform hover:scale-105 cursor-pointer ${colorClass}`}
                            >
                              {i + 1}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-4 mt-6 text-xs justify-center flex-wrap">
                        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-green-500 rounded-md" /> Present</span>
                        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-red-500 rounded-md" /> Absent</span>
                        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-gray-300 bg-surface rounded-md" /> Holiday</span>
                      </div>
                    </div>

                    {/* Attendance % per subject as horizontal bar chart (Recharts) */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-lg mb-4 text-white">Subject-wise Attendance Rates</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={studentSummary?.subjectWise || []}
                            margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} stroke="#6b7280" />
                            <YAxis type="category" dataKey="subject" stroke="#6b7280" width={110} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                              }}
                            />
                            <Bar dataKey="attendanceRate" fill="#6C63FF" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <AnimatePresence>
                {isManageClassesOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.95, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.95, y: 15 }}
                      className="w-full max-w-md bg-gradient-to-b from-[#1e293b]/90 to-[#0f172a]/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-white"
                    >
                      {/* Decorative radial gradients */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[40px] pointer-events-none" />

                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-extrabold bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent">Manage Class Enrollments</h3>
                          <p className="text-xs text-gray-400 mt-1">Select the classes you want to attend</p>
                        </div>
                        <button 
                          onClick={() => setIsManageClassesOpen(false)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Class Checkbox List */}
                      <div className="space-y-3 mb-6">
                        {[
                          { id: 'CS-3A', name: 'CS-3A', subject: 'Data Structures', desc: 'Mon/Thu/Fri 9:00 AM' },
                          { id: 'CS-3B', name: 'CS-3B', subject: 'Mathematics', desc: 'Tue/Thu 1:00 PM' },
                          { id: 'CS-4A', name: 'CS-4A', subject: 'English Literature', desc: 'Tue/Fri 1:00 PM' },
                        ].map((cls) => {
                          const isChecked = enrolledClasses.includes(cls.id);
                          return (
                            <label 
                              key={cls.id}
                              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                                isChecked 
                                  ? 'bg-indigo-500/10 border-indigo-500/40 hover:bg-indigo-500/15' 
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                              }`}
                            >
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setEnrolledClasses(enrolledClasses.filter(c => c !== cls.id));
                                  } else {
                                    setEnrolledClasses([...enrolledClasses, cls.id]);
                                  }
                                }}
                                className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm text-white">{cls.name}</span>
                                  <span className="text-[10px] font-mono text-indigo-400">{cls.subject}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{cls.desc}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button 
                          onClick={() => {
                            fetchStudentProfile();
                            setIsManageClassesOpen(false);
                          }}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSaveClasses(enrolledClasses)}
                          className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-500/15"
                        >
                          Save Changes
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TEACHER DASHBOARD VIEW */}
          {currentRole === 'teacher' && (
            <div className="space-y-8">
              
              {/* TAB 1: TEACHER HOME */}
              {teacherTab === 'home' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Teacher Workspace Overview</h1>
                    <p className="text-gray-600 dark:text-text-muted mt-1">Real-time attendance analysis and schedule monitoring.</p>
                  </div>

                  {/* Summary Widgets */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card title="Today's Classes" value={String(classes.length)} icon="🏫" />
                    <Card 
                      title="Total Students Managed" 
                      value={classes.length > 0 ? String(classes.reduce((sum, c) => sum + c.studentCount, 0)) : "0"} 
                      icon="👥" 
                    />
                    <Card 
                      title="Average Attendance Rate" 
                      value={classes.length > 0 ? (classes.reduce((sum, c) => sum + c.attendanceRate, 0) / classes.length).toFixed(1) + "%" : "100.0%"} 
                      icon="📈" 
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Class Sessions List */}
                    <div className="lg:col-span-2 bg-surface rounded-xl shadow-md p-6">
                      <h2 className="text-xl font-bold mb-4 text-white">Today's Class Schedule</h2>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {classes.map((c: ClassSession) => (
                          <div key={c.id} className="py-4 flex justify-between items-center">
                            <div>
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                {c.name}
                              </span>
                              <h3 className="font-semibold text-text-primary mt-1">{c.subject}</h3>
                              <p className="text-xs text-gray-500 dark:text-text-muted mt-0.5">{c.schedule}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setMarkingClassId(c.id);
                                  handleTabChange('attendance');
                                }}
                                className="px-3.5 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700"
                              >
                                Mark Attendance
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Link Widgets */}
                    <div className="bg-surface rounded-xl shadow-md p-6 space-y-4">
                      <h2 className="text-xl font-bold text-white">Quick Tasks</h2>
                      <button
                        onClick={() => handleTabChange('attendance')}
                        className="w-full text-left p-3.5 rounded-lg border border-border hover:border-purple-500 transition-colors flex items-center gap-3"
                      >
                        <span className="text-xl">📅</span>
                        <div>
                          <div className="font-semibold text-sm text-white">Mark Attendance</div>
                          <div className="text-xs text-gray-500">Log class roll calls</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleTabChange('upload')}
                        className="w-full text-left p-3.5 rounded-lg border border-border hover:border-purple-500 transition-colors flex items-center gap-3"
                      >
                        <span className="text-xl">📚</span>
                        <div>
                          <div className="font-semibold text-sm text-white">Upload Class Notes</div>
                          <div className="text-xs text-gray-500">Post files to class feed</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleTabChange('students')}
                        className="w-full text-left p-3.5 rounded-lg border border-border hover:border-purple-500 transition-colors flex items-center gap-3"
                      >
                        <span className="text-xl">🔎</span>
                        <div>
                          <div className="font-semibold text-sm text-white">Student Directory</div>
                          <div className="text-xs text-gray-500">Search profiles & statistics</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Coursework & Assignment Creation Form */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-1 bg-surface border border-border rounded-2xl shadow-md p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />
                      <h2 className="text-xs font-bold mb-4 text-primary-light/60 uppercase tracking-wider font-mono">Create New Coursework Assignment</h2>
                      <form onSubmit={handleCreateAssignment} className="space-y-4">
                        <div>
                          <label className="block text-[10px] text-text-secondary uppercase font-mono mb-1">Title</label>
                          <input
                            type="text"
                            placeholder="e.g., Physics Lab 1"
                            value={newAssignmentTitle}
                            onChange={(e) => setNewAssignmentTitle(e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-text-secondary uppercase font-mono mb-1">Description</label>
                          <textarea
                            rows={3}
                            placeholder="Syllabus, references, or description..."
                            value={newAssignmentDesc}
                            onChange={(e) => setNewAssignmentDesc(e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-text-secondary uppercase font-mono mb-1">Class ID</label>
                            <select
                              value={newAssignmentClass}
                              onChange={(e) => setNewAssignmentClass(e.target.value)}
                              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 font-mono"
                            >
                              {classes.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                              {classes.length === 0 && <option value="c1">CS-3A</option>}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-text-secondary uppercase font-mono mb-1">Due Date</label>
                            <input
                              type="datetime-local"
                              value={newAssignmentDueDate}
                              onChange={(e) => setNewAssignmentDueDate(e.target.value)}
                              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 font-mono"
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={isCreatingAssignment}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors disabled:bg-gray-500"
                        >
                          {isCreatingAssignment ? 'Creating...' : 'Assign to Class'}
                        </button>
                      </form>
                    </div>

                    {/* Active Student Doubts Resolution Feed */}
                    <div className="lg:col-span-2 bg-surface border border-border rounded-2xl shadow-md p-6 relative overflow-hidden">
                      <h2 className="text-xs font-bold mb-4 text-primary-light/60 uppercase tracking-wider font-mono">Student Doubts Inbox</h2>
                      <div className="space-y-4 max-h-[320px] overflow-auto pr-2">
                        {doubts.filter(d => d.status === 'open').length === 0 ? (
                          <p className="text-xs text-text-muted">No pending doubts in your inbox. Great job!</p>
                        ) : (
                          doubts.filter(d => d.status === 'open').map((doubt: any) => (
                            <div key={doubt.id} className="p-3.5 bg-surface-2 border border-border rounded-xl">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-bold text-primary-light">{doubt.student?.name || 'Student'} asked:</p>
                                  <p className="text-sm text-white font-semibold mt-1">"{doubt.content}"</p>
                                </div>
                                <span className="text-[9px] text-text-muted font-mono">{new Date(doubt.created_at).toLocaleString()}</span>
                              </div>
                              
                              {resolvingDoubtId === doubt.id ? (
                                <div className="mt-3 space-y-2">
                                  <textarea
                                    rows={3}
                                    placeholder="Type your response to the student..."
                                    value={doubtResponseText}
                                    onChange={(e) => setDoubtResponseText(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs text-white outline-none focus:border-purple-500"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => setResolvingDoubtId(null)}
                                      className="px-3 py-1 bg-surface-2 border border-border rounded text-[10px] text-white hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleResolveDoubtSubmit(doubt.id)}
                                      disabled={isResolvingDoubt}
                                      className="px-3 py-1 bg-purple-600 rounded text-[10px] text-white font-bold hover:bg-purple-700 disabled:bg-gray-500"
                                    >
                                      {isResolvingDoubt ? 'Resolving...' : 'Send Response'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={() => {
                                      setResolvingDoubtId(doubt.id);
                                      setDoubtResponseText('');
                                    }}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                                  >
                                    Answer Doubt
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Coursework Submissions Grading Queue */}
                  <div className="bg-surface border border-border rounded-2xl shadow-md p-6 mt-6 relative overflow-hidden">
                    <h2 className="text-xs font-bold mb-4 text-primary-light/60 uppercase tracking-wider font-mono">Coursework Submission & Grading Queue</h2>
                    <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                      {submissions.filter(s => s.status === 'submitted').length === 0 ? (
                        <p className="text-xs text-text-muted">No pending submissions to grade.</p>
                      ) : (
                        submissions.filter(s => s.status === 'submitted').map((sub: any) => (
                          <div key={sub.id} className="p-4 bg-surface-2 border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-primary-light">
                                {sub.student?.name} &bull; <span className="font-mono text-[10px] text-text-muted">Class: {sub.assignment?.class_id}</span>
                              </p>
                              <h3 className="font-bold text-white text-sm mt-1">{sub.assignment?.title}</h3>
                              <p className="text-xs text-white bg-surface p-2.5 rounded border border-border mt-2 whitespace-pre-wrap">
                                {sub.submission_content}
                              </p>
                              <p className="text-[9px] text-text-muted font-mono mt-1">Submitted on: {new Date(sub.submitted_at).toLocaleString()}</p>
                            </div>

                            <div className="flex-shrink-0">
                              {gradingSubmissionId === sub.id ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Grade (e.g., A+, 95)"
                                      value={gradeText}
                                      onChange={(e) => setGradeText(e.target.value)}
                                      className="bg-surface border border-border rounded-lg p-1.5 text-xs text-white outline-none w-32 focus:border-purple-500"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Feedback comments..."
                                      value={feedbackText}
                                      onChange={(e) => setFeedbackText(e.target.value)}
                                      className="bg-surface border border-border rounded-lg p-1.5 text-xs text-white outline-none w-48 focus:border-purple-500"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => setGradingSubmissionId(null)}
                                      className="px-3 py-1 bg-surface-2 border border-border rounded text-[10px] text-white hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleGradeSubmissionSubmit(sub.id)}
                                      disabled={isGradingSubmission}
                                      className="px-3 py-1 bg-purple-600 rounded text-[10px] text-white font-bold hover:bg-purple-700 disabled:bg-gray-500"
                                    >
                                      {isGradingSubmission ? 'Grading...' : 'Submit Grade'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setGradingSubmissionId(sub.id);
                                    setGradeText('');
                                    setFeedbackText('');
                                  }}
                                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                                >
                                  Grade Submission
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Connection Agent Timeline Feed (Teacher view) */}
                  <div className="bg-surface border border-border rounded-2xl shadow-md p-6 mt-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[40px] pointer-events-none" />
                    <h2 className="text-xs font-bold mb-5 text-primary-light/60 uppercase tracking-wider font-mono">Shared Classroom Activity Timeline</h2>
                    <div className="space-y-4 max-h-[300px] overflow-auto pr-2 font-mono">
                      {timeline.length === 0 ? (
                        <p className="text-sm text-text-muted">No classroom activity logged yet.</p>
                      ) : (
                        timeline.map((log: any) => {
                          let icon = '🔄';
                          let text = '';
                          if (log.action_type === 'assignment_created') {
                            icon = '📝';
                            text = `${log.user_name} created assignment: '${log.metadata_json?.assignment_title}'`;
                          } else if (log.action_type === 'assignment_assigned') {
                            icon = '📅';
                            text = `New assignment assigned: '${log.metadata_json?.assignment_title}'`;
                          } else if (log.action_type === 'assignment_submitted') {
                            icon = '📤';
                            text = `${log.user_name} submitted assignment: '${log.metadata_json?.assignment_title}'`;
                          } else if (log.action_type === 'assignment_graded') {
                            icon = '💯';
                            text = `Assignment graded: '${log.metadata_json?.assignment_title}' with score '${log.metadata_json?.grade}'`;
                          } else if (log.action_type === 'doubt_asked') {
                            icon = '❓';
                            text = `${log.user_name} asked a doubt: "${log.metadata_json?.content_preview}"`;
                          } else if (log.action_type === 'doubt_resolved') {
                            icon = '✅';
                            text = `Doubt resolved by teacher: "${log.metadata_json?.question || 'Student doubt'}"`;
                          } else if (log.action_type === 'attendance_marked') {
                            icon = '📋';
                            if (log.role === 'teacher') {
                              text = `Teacher logged attendance for Class ${log.metadata_json?.class_id} (${log.metadata_json?.students_count} students)`;
                            } else {
                              text = `${log.user_name} was marked ${log.metadata_json?.status} in Class ${log.metadata_json?.class_id}`;
                            }
                          } else if (log.action_type === 'quiz_attempt') {
                            icon = log.metadata_json?.correct ? '🔥' : '✏️';
                            text = `${log.user_name} attempted a ${log.metadata_json?.subject} quiz question on ${log.metadata_json?.topic} (${log.metadata_json?.correct ? 'Correct' : 'Incorrect'})`;
                          }
                          
                          return (
                            <div key={log.id} className="flex items-start gap-3 text-xs bg-surface-2/40 border border-border/30 p-2.5 rounded-xl animate-fadeIn">
                              <span className="text-lg">{icon}</span>
                              <div className="flex-1 font-sans">
                                <p className="text-white font-semibold">{text}</p>
                                <p className="text-[10px] text-text-muted mt-0.5 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: CLASS MANAGEMENT */}
              {teacherTab === 'classes' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Class Management</h1>
                    <p className="text-gray-600 dark:text-text-muted mt-1">Overview of all assigned classes and their stats.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {classes.map((c: ClassSession) => (
                      <div key={c.id} className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                              {c.name}
                            </span>
                            <h2 className="text-xl font-bold mt-2 text-white">{c.subject}</h2>
                          </div>
                          <span className="text-sm font-semibold text-gray-500 dark:text-text-muted">
                            {c.studentCount} students
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-gray-500 dark:text-text-muted">
                          <div>📅 <strong>Schedule:</strong> {c.schedule}</div>
                          <div>📈 <strong>Avg Attendance:</strong> {c.attendanceRate}%</div>
                        </div>

                        <div className="w-full bg-gray-200 bg-surface h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${c.attendanceRate >= 75 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${c.attendanceRate}%` }}
                          />
                        </div>

                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setMarkingClassId(c.id);
                              handleTabChange('attendance');
                            }}
                            className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
                          >
                            Mark Roll Call
                          </button>
                          <button
                            onClick={() => {
                              setUploadClassId(c.id);
                              handleTabChange('upload');
                            }}
                            className="px-3 py-2 border border-border text-gray-700 dark:text-text-secondary rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Add Notes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: MARK ATTENDANCE */}
              {teacherTab === 'attendance' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Mark Class Attendance</h1>
                    <p className="text-gray-600 dark:text-text-muted mt-1">Select class, date, apply bulk actions, and submit status toggles.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Selectors Panel */}
                    <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-sm text-white">Session Selectors</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 dark:text-text-muted">Class:</label>
                          <select
                            value={markingClassId}
                            onChange={(e) => setMarkingClassId(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
                          >
                            {classes.map((c: ClassSession) => (
                              <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 dark:text-text-muted">Date:</label>
                          <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Export Panel */}
                    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <h3 className="font-bold text-sm text-white">Export Attendance Report</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 dark:text-text-muted mb-1">Start Date</label>
                          <input
                            type="date"
                            value={exportStartDate}
                            onChange={(e) => setExportStartDate(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs text-text-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 dark:text-text-muted mb-1">End Date</label>
                          <input
                            type="date"
                            value={exportEndDate}
                            onChange={(e) => setExportEndDate(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs text-text-primary outline-none"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleExportCSV}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors mt-2"
                      >
                        📥 Export CSV Report
                      </button>
                    </div>
                  </div>

                  <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-surface-2 border-b border-border flex justify-between items-center flex-wrap gap-2">
                      <div className="text-sm font-semibold dark:text-text-secondary">Student Roll Call List</div>
                      
                      {/* Bulk Actions Panel */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const updated = { ...attendanceRecords };
                            students.forEach((s: StudentAttendance) => { updated[s.id] = 'Present'; });
                            setAttendanceRecords(updated);
                          }}
                          className="px-3 py-1 text-xs border border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 font-bold transition-all"
                        >
                          Mark All Present
                        </button>
                        <button
                          onClick={() => {
                            const updated = { ...attendanceRecords };
                            students.forEach((s: StudentAttendance) => { updated[s.id] = 'Absent'; });
                            setAttendanceRecords(updated);
                          }}
                          className="px-3 py-1 text-xs border border-red-500 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 font-bold transition-all"
                        >
                          Mark All Absent
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-150 dark:divide-gray-700">
                      {students.map((student: StudentAttendance) => (
                        <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <div>
                            <div className="font-semibold text-text-primary">{student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-text-muted">{student.email}</div>
                          </div>

                          <div className="flex items-center gap-6">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${student.attendanceRate >= 75 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                              Rate: {student.attendanceRate}%
                            </span>

                            {/* Styled Toggle Switch */}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold w-14 text-right ${attendanceRecords[student.id] === 'Present' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                {attendanceRecords[student.id] || 'Absent'}
                              </span>
                              <button
                                onClick={() => toggleAttendance(student.id)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                  attendanceRecords[student.id] === 'Present' ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    attendanceRecords[student.id] === 'Present' ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 border-t border-border flex justify-end">
                      <button
                        onClick={handleSubmitAttendance}
                        disabled={isSubmittingAttendance}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-md disabled:bg-gray-400 transition-colors"
                      >
                        {isSubmittingAttendance ? 'Submitting...' : 'Submit Attendance Records'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: STUDENT LIST & DETAIL */}
              {teacherTab === 'students' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Student Roster</h1>
                    <p className="text-gray-600 dark:text-text-muted mt-1">Search, apply attendance filters, and click student to view progress.</p>
                  </div>

                  {/* Filter Bar */}
                  <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <input
                      type="text"
                      placeholder="🔍 Search students by name or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full md:w-80 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-purple-500"
                    />

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <span className="text-xs font-semibold text-gray-500 dark:text-text-muted whitespace-nowrap">
                        Min Attendance: {minAttendanceFilter}%
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={minAttendanceFilter}
                        onChange={(e) => setMinAttendanceFilter(Number(e.target.value))}
                        className="w-full md:w-48 accent-purple-600 cursor-pointer"
                      />
                      <button
                        onClick={() => { setStudentSearch(''); setMinAttendanceFilter(0); }}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline whitespace-nowrap font-medium"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>

                  {/* Student Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredStudents.map((s: StudentAttendance) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className="bg-surface border border-border rounded-xl p-5 hover:border-purple-500 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                              {s.name[0]}
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${s.attendanceRate >= 75 ? 'bg-green-100 text-green-800 dark:bg-green-900/30' : 'bg-red-100 text-red-800 dark:bg-red-900/30'}`}>
                              {s.attendanceRate}% Att
                            </span>
                          </div>
                          <h3 className="font-bold text-text-primary">{s.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{s.email}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs text-gray-500 dark:text-text-muted">
                          <div>📝 Quiz Avg: <strong>{s.quizPerformance}%</strong></div>
                          <div>📒 Notes: <strong>{s.notesActivityCount}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredStudents.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-text-muted">
                      No students found matching your filters.
                    </div>
                  )}

                  {/* Student Details Modal */}
                  <AnimatePresence>
                    {selectedStudent && (
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-surface rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden"
                        >
                          <div className="p-6 border-b border-border flex justify-between items-center">
                            <div>
                              <h2 className="text-xl font-bold text-white">{selectedStudent.name}</h2>
                              <p className="text-xs text-gray-500">{selectedStudent.email} — Class cs-3a</p>
                            </div>
                            <button
                              onClick={() => setSelectedStudent(null)}
                              className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-gray-700 dark:text-text-secondary hover:bg-gray-200"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="p-6 space-y-6">
                            {/* Analytics Row */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-surface-2 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedStudent.attendanceRate}%</div>
                                <div className="text-xs text-gray-500 mt-1">Attendance</div>
                              </div>
                              <div className="bg-surface-2 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedStudent.quizPerformance}%</div>
                                <div className="text-xs text-gray-500 mt-1">Quiz Avg</div>
                              </div>
                              <div className="bg-surface-2 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{selectedStudent.notesActivityCount}</div>
                                <div className="text-xs text-gray-500 mt-1">Notes Count</div>
                              </div>
                            </div>

                            {/* 30 Days Attendance Calendar */}
                            <div>
                              <h3 className="font-bold text-sm mb-3 text-white">Past 30 Days Attendance Grid</h3>
                              <div className="grid grid-cols-10 gap-2">
                                {selectedStudent.history.map((h: { date: string; status: 'Present' | 'Absent' }, i: number) => (
                                  <div
                                    key={i}
                                    title={`Date: ${h.date} - ${h.status}`}
                                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-bold text-white ${
                                      h.status === 'Present' ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-4 mt-3 text-xs justify-center">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded" /> Present</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded" /> Absent</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
                            <button
                              onClick={() => setSelectedStudent(null)}
                              className="px-5 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
                            >
                              Close Profile
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* TAB 5: UPLOAD MATERIAL */}
              {teacherTab === 'upload' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Upload Class Materials</h1>
                    <p className="text-gray-600 dark:text-text-muted mt-1">Publish lecture notes, quiz syllabi, or exam preparation tips to the student feed.</p>
                  </div>

                  <div className="bg-surface border border-border rounded-xl p-6 shadow-sm max-w-xl">
                    <form onSubmit={handleUploadMaterial} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold dark:text-text-secondary">Target Class:</label>
                        <select
                          value={uploadClassId}
                          onChange={(e) => setUploadClassId(e.target.value)}
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none"
                        >
                          {classes.map((c: ClassSession) => (
                            <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold dark:text-text-secondary">Notes Title:</label>
                        <input
                          type="text"
                          placeholder="e.g. Lecture 4: Binary Search Trees Overview"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold dark:text-text-secondary">Note Content / Description:</label>
                        <textarea
                          rows={6}
                          placeholder="Write markdown or general notes contents here to share with the class..."
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isUploading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-md transition-colors disabled:bg-gray-400"
                      >
                        {isUploading ? 'Uploading Notes...' : 'Upload Notes to Feed'}
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
