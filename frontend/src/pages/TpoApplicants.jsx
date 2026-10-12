import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import {
  GraduationCap,
  ArrowLeft,
  Building2,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Loader2,
  FileSpreadsheet,
  Edit,
  Save,
  Download,
  Calendar,
  Video,
  MapPin,
  Layers,
  CheckSquare,
  Square,
  Send
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

const STAGES = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Assessment',
  'Interview Scheduled',
  'Selected',
  'Rejected',
];

export default function TpoApplicants() {
  const [jobs, setJobs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Filters & Search
  const [stageFilter, setStageFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickUpdatingId, setQuickUpdatingId] = useState(null);

  // Bulk Status Mode State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState(new Set());
  const [bulkTargetStatus, setBulkTargetStatus] = useState('Shortlisted');
  const [bulkNotes, setBulkNotes] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Transition Modal State
  const [updatingApp, setUpdatingApp] = useState(null);
  const [newStatus, setNewStatus] = useState('Shortlisted');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [submittingTransition, setSubmittingTransition] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Local timezone safe date formatter for datetime-local input
  const formatDateTimeLocal = (date) => {
    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getDefaultInterviewTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return formatDateTimeLocal(d);
  };

  // Interview Schedule Modal State
  const [schedulingApp, setSchedulingApp] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    round_name: 'Technical Round 1',
    scheduled_at: getDefaultInterviewTime(),
    mode: 'Online',
    venue_or_link: 'https://meet.google.com/xyz-placement-interview',
    instructions: 'Keep your webcam enabled and resume ready.',
  });
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const openScheduleModal = (app) => {
    setSchedulingApp(app);
    const nextRound = app.interview_details?.round_name
      ? (app.interview_details.round_name.includes('Round 1') ? 'Technical Round 2' : `${app.interview_details.round_name} (Next Round)`)
      : 'Technical Round 1';

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 2);
    defaultDate.setHours(10, 0, 0, 0);

    setScheduleData({
      round_name: nextRound,
      scheduled_at: formatDateTimeLocal(defaultDate),
      mode: app.interview_details?.mode || 'Online',
      venue_or_link: app.interview_details?.venue_or_link || 'https://meet.google.com/xyz-placement-interview',
      instructions: app.interview_details?.instructions || 'Keep your webcam enabled and resume ready.',
    });
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!schedulingApp) return;

    setSubmittingSchedule(true);
    setMessage({ type: '', text: '' });

    try {
      // Backend accepts both users _id or student_profiles _id
      const studentIdToSchedule = schedulingApp.user_id || schedulingApp.student_id;

      await apiClient.post('/interviews/schedule', {
        job_id: selectedJobId,
        student_ids: [studentIdToSchedule],
        round_name: scheduleData.round_name,
        scheduled_at: new Date(scheduleData.scheduled_at).toISOString(),
        mode: scheduleData.mode,
        venue_or_link: scheduleData.venue_or_link,
        instructions: scheduleData.instructions,
        advance_stage: true,
      });

      setMessage({
        type: 'success',
        text: `Interview scheduled for ${schedulingApp.student_snapshot?.full_name}! Candidate notified & stage advanced to 'Interview Scheduled'.`,
      });
      setSchedulingApp(null);
      fetchApplicants();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to schedule interview.',
      });
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // 1. Fetch available jobs and courses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [jobsRes, coursesRes] = await Promise.all([
          apiClient.get('/jobs'),
          apiClient.get('/courses')
        ]);
        setJobs(jobsRes.data);
        setCourses(coursesRes.data);
        if (jobsRes.data.length > 0) {
          setSelectedJobId(jobsRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Fetch applicants when selected job or filters change
  const fetchApplicants = async () => {
    if (!selectedJobId) return;
    try {
      setLoadingApplicants(true);
      const params = {};
      if (stageFilter) params.status = stageFilter;
      if (branchFilter) params.branch = branchFilter;
      if (minCgpaFilter) params.min_cgpa = parseFloat(minCgpaFilter);

      const res = await apiClient.get(`/applications/job/${selectedJobId}`, { params });
      setApplicants(res.data);
    } catch (err) {
      console.error('Failed to fetch applicants:', err);
    } finally {
      setLoadingApplicants(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [selectedJobId, stageFilter, branchFilter, minCgpaFilter]);

  const handleQuickStatusChange = async (app, targetStatus) => {
    if (targetStatus === 'Interview Scheduled') {
      openScheduleModal(app);
      return;
    }

    setQuickUpdatingId(app.id);
    setMessage({ type: '', text: '' });
    try {
      await apiClient.put(`/applications/${app.id}/status`, {
        status: targetStatus,
        notes: `Stage updated to ${targetStatus} via one-click status selector.`,
      });
      setMessage({
        type: 'success',
        text: `Updated status for '${app.student_snapshot.full_name}' to '${targetStatus}'. Email & in-portal notifications dispatched!`,
      });
      fetchApplicants();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update status.',
      });
    } finally {
      setQuickUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!updatingApp) return;

    setSubmittingTransition(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        status: newStatus,
        notes: transitionNotes,
      };

      if (newStatus === 'Interview Scheduled') {
        payload.interview_date = new Date(scheduleData.scheduled_at).toISOString();
        payload.interview_round = scheduleData.round_name;
        payload.interview_mode = scheduleData.mode;
        payload.interview_venue_or_link = scheduleData.venue_or_link;
        payload.interview_instructions = scheduleData.instructions;
      }

      await apiClient.put(`/applications/${updatingApp.id}/status`, payload);

      setMessage({
        type: 'success',
        text: `Applicant '${updatingApp.student_snapshot.full_name}' transitioned to '${newStatus}'! In-app & email notifications delivered.`,
      });
      setUpdatingApp(null);
      setTransitionNotes('');
      fetchApplicants();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update stage.',
      });
    } finally {
      setSubmittingTransition(false);
    }
  };

  const filteredApplicants = applicants.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = (app.student_snapshot?.full_name || '').toLowerCase();
    const roll = (app.student_snapshot?.roll_number || '').toLowerCase();
    const email = (app.student_snapshot?.email || '').toLowerCase();
    const dept = (app.student_snapshot?.department || '').toLowerCase();
    const skills = (app.student_snapshot?.skills || []).join(' ').toLowerCase();

    return (
      name.includes(q) ||
      roll.includes(q) ||
      email.includes(q) ||
      dept.includes(q) ||
      skills.includes(q)
    );
  });

  // Bulk Interview Schedule State
  const [bulkScheduleData, setBulkScheduleData] = useState({
    round_name: 'Technical Round 1',
    scheduled_at: getDefaultInterviewTime(),
    mode: 'Online',
    venue_or_link: 'https://meet.google.com/xyz-placement-interview',
    instructions: 'Keep your webcam enabled and resume ready.',
  });

  const handleToggleSelectApp = (appId) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedAppIds.size === filteredApplicants.length && filteredApplicants.length > 0) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(filteredApplicants.map((a) => a.id)));
    }
  };

  const handleExecuteBulkStatusChange = async () => {
    if (selectedAppIds.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one candidate checkbox.' });
      return;
    }

    setSubmittingBulk(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        application_ids: Array.from(selectedAppIds),
        target_status: bulkTargetStatus,
        notes: bulkNotes || `Bulk transition to ${bulkTargetStatus}.`,
      };

      if (bulkTargetStatus === 'Interview Scheduled') {
        payload.interview_date = new Date(bulkScheduleData.scheduled_at).toISOString();
        payload.interview_round = bulkScheduleData.round_name;
        payload.interview_mode = bulkScheduleData.mode;
        payload.interview_venue_or_link = bulkScheduleData.venue_or_link;
        payload.interview_instructions = bulkScheduleData.instructions;
      }

      const res = await apiClient.post('/applications/bulk-status', payload);

      setMessage({
        type: 'success',
        text: `Bulk Update Successful: ${res.data.updated_count} candidates transitioned to "${bulkTargetStatus}"! Notifications sent.`,
      });
      setSelectedAppIds(new Set());
      fetchApplicants();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to execute bulk status transition.',
      });
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleDownloadResume = async (studentId, studentName) => {
    try {
      const response = await apiClient.get(`/students/resume/download?student_id=${studentId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${studentName}_resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Resume file is not available or not uploaded for this student.');
    }
  };

  const handleExportExcel = async () => {
    if (!selectedJobId) return;
    setExporting(true);
    setMessage({ type: '', text: '' });
    try {
      const params = {};
      if (stageFilter) params.status = stageFilter;
      if (branchFilter) params.branch = branchFilter;
      if (minCgpaFilter) params.min_cgpa = parseFloat(minCgpaFilter);

      const response = await apiClient.get(`/exports/applications/${selectedJobId}/excel`, {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const currentJob = jobs.find((j) => j.id === selectedJobId);
      const safePrefix = (currentJob?.company_name || 'Drive').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `${safePrefix}_Applicants_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: 'Microsoft Excel (.xlsx) roster exported successfully with styled headers and formula protection.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to export Excel report. Please ensure applications exist for this criteria.',
      });
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Selected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Shortlisted':
      case 'Interview Scheduled':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Assessment':
      case 'Under Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Status Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-start gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Opportunity Selector & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Placement Drive *
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.company_name} — {j.title} ({j.salary_package})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Recruitment Stage</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  <option value="">All Stages</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  <option value="">All Branches</option>
                  {courses.length > 0
                    ? courses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.name})
                        </option>
                      ))
                    : ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Min CGPA</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 8.0"
                  value={minCgpaFilter}
                  onChange={(e) => setMinCgpaFilter(e.target.value)}
                  className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search Candidates</label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Name, roll, email, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-40 sm:w-48 pl-8 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      title="Clear candidate search"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applicants Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Applicant Roster</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified candidate profile snapshots captured at application time.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsBulkMode(!isBulkMode);
                  setSelectedAppIds(new Set());
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  isBulkMode
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                }`}
                title="Toggle Bulk Status Change Mode"
              >
                <Layers className="h-3.5 w-3.5" />
                {isBulkMode ? 'Exit Bulk Mode' : 'Bulk Status Mode'}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || applicants.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                title="Download genuine Microsoft Excel (.xlsx) file"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                Export to Excel (.xlsx)
              </button>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {filteredApplicants.length} {filteredApplicants.length === applicants.length ? 'Applicants' : `of ${applicants.length} Applicants`}
              </span>
            </div>
          </div>

          {/* Bulk Action Controls Banner */}
          {isBulkMode && (
            <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-600" /> Bulk Action:
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800">
                  {selectedAppIds.size} Selected
                </span>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-slate-600">Target Status:</label>
                  <select
                    value={bulkTargetStatus}
                    onChange={(e) => setBulkTargetStatus(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {STAGES.filter((s) => s !== 'Applied').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Optional transition notes..."
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  {selectedAppIds.size === filteredApplicants.length && filteredApplicants.length > 0
                    ? 'Deselect All'
                    : 'Select All Visible'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkStatusChange}
                  disabled={submittingBulk || selectedAppIds.size === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {submittingBulk ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {submittingBulk
                    ? 'Applying...'
                    : `Apply "${bulkTargetStatus}" to ${selectedAppIds.size} Candidates`}
                </button>
              </div>
            </div>
          )}

          {/* Bulk Interview Schedule Parameters */}
          {isBulkMode && bulkTargetStatus === 'Interview Scheduled' && (
            <div className="p-4 bg-indigo-100/50 border-b border-indigo-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-1">Interview Round</label>
                <input
                  type="text"
                  value={bulkScheduleData.round_name}
                  onChange={(e) => setBulkScheduleData({ ...bulkScheduleData, round_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-1">Interview Date & Time</label>
                <input
                  type="datetime-local"
                  value={bulkScheduleData.scheduled_at}
                  onChange={(e) => setBulkScheduleData({ ...bulkScheduleData, scheduled_at: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-1">Mode & Link / Venue</label>
                <div className="flex gap-1.5">
                  <select
                    value={bulkScheduleData.mode}
                    onChange={(e) => setBulkScheduleData({ ...bulkScheduleData, mode: e.target.value })}
                    className="w-24 px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="Online">Online</option>
                    <option value="In-Person">In-Person</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Meeting URL or Room"
                    value={bulkScheduleData.venue_or_link}
                    onChange={(e) => setBulkScheduleData({ ...bulkScheduleData, venue_or_link: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-1">Instructions for Applicants</label>
                <input
                  type="text"
                  placeholder="Instructions for applicants..."
                  value={bulkScheduleData.instructions}
                  onChange={(e) => setBulkScheduleData({ ...bulkScheduleData, instructions: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-800"
                />
              </div>
            </div>
          )}

          {loadingApplicants ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
              Loading applicant records...
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">
                {searchQuery ? `No candidates match "${searchQuery}".` : 'No applicants match the current criteria.'}
              </p>
              <p className="text-slate-400 mt-1">
                {searchQuery ? 'Try adjusting your search query or reset filters.' : 'Students can apply directly from their Opportunity Catalog.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    {isBulkMode && (
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredApplicants.length > 0 &&
                            selectedAppIds.size === filteredApplicants.length
                          }
                          onChange={handleSelectAllVisible}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          title="Select / Deselect all visible applicants"
                        />
                      </th>
                    )}
                    <th className="py-3 px-4">Student Name & Roll</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">CGPA</th>
                    <th className="py-3 px-4">Active Backlogs</th>
                    <th className="py-3 px-4">Skills</th>
                    <th className="py-3 px-4">Current Stage (Quick Update)</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredApplicants.map((app) => (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isBulkMode && selectedAppIds.has(app.id) ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {isBulkMode && (
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedAppIds.has(app.id)}
                            onChange={() => handleToggleSelectApp(app.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block">{app.student_snapshot?.full_name}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {app.student_snapshot?.roll_number || app.student_snapshot?.email}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {app.student_snapshot?.department}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {app.student_snapshot?.cgpa?.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            app.student_snapshot?.active_backlogs > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {app.student_snapshot?.active_backlogs}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {app.student_snapshot?.skills?.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600"
                            >
                              {s}
                            </span>
                          ))}
                          {app.student_snapshot?.skills?.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{app.student_snapshot.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="relative inline-flex items-center">
                          {quickUpdatingId === app.id ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                            </span>
                          ) : (
                            <select
                              value={app.status}
                              onChange={(e) => handleQuickStatusChange(app, e.target.value)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${getStatusBadgeClass(
                                app.status
                              )}`}
                              title="Click to directly update candidate stage"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s} className="bg-white text-slate-800 font-medium">
                                  {s === 'Interview Scheduled' ? '📅 Schedule Interview...' : s}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {app.interview_details && (
                          <span className="block text-[10px] text-purple-700 font-semibold mt-1">
                            📅 {app.interview_details.round_name} &bull;{' '}
                            {app.interview_details.scheduled_at
                              ? new Date(app.interview_details.scheduled_at).toLocaleDateString(undefined, {
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : 'Set'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {app.student_snapshot?.resume_filename && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadResume(
                                  app.student_id,
                                  app.student_snapshot?.full_name
                                )
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Download Candidate Resume"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openScheduleModal(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                            title="Schedule an interview round for this student"
                          >
                            <Calendar className="h-3 w-3" />
                            Schedule Round
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUpdatingApp(app);
                              setNewStatus(app.status);
                              setScheduleData((prev) => ({
                                ...prev,
                                scheduled_at: getDefaultInterviewTime(),
                              }));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            <Edit className="h-3 w-3" />
                            Update Stage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transition Status Modal */}
        {updatingApp && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-xl">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Update Recruitment Stage
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {updatingApp.student_snapshot?.full_name}
                  </h3>
                </div>
                <button
                  onClick={() => setUpdatingApp(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select New Stage *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If Interview Scheduled is selected, require interview date & details */}
                {newStatus === 'Interview Scheduled' && (
                  <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      Configure Interview Schedule Details *
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Round Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={scheduleData.round_name}
                        onChange={(e) => setScheduleData({ ...scheduleData, round_name: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Date & Time *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={scheduleData.scheduled_at}
                          onChange={(e) => setScheduleData({ ...scheduleData, scheduled_at: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Mode *
                        </label>
                        <select
                          value={scheduleData.mode}
                          onChange={(e) => setScheduleData({ ...scheduleData, mode: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-medium"
                        >
                          <option value="Online">Online</option>
                          <option value="In-Person">In-Person</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Meeting Link or Campus Venue *
                      </label>
                      <input
                        type="text"
                        required
                        value={scheduleData.venue_or_link}
                        onChange={(e) => setScheduleData({ ...scheduleData, venue_or_link: e.target.value })}
                        placeholder="https://meet.google.com/... or Campus Room"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-medium"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Evaluation Notes / Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Cleared online assessment round with 85% score. Technical interview scheduled."
                    value={transitionNotes}
                    onChange={(e) => setTransitionNotes(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    This message will be included in the candidate's audit timeline.
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setUpdatingApp(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTransition}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submittingTransition ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Confirm Stage Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Schedule Interview Modal */}
        {schedulingApp && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Schedule Interview Round
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {schedulingApp.student_snapshot?.full_name} ({schedulingApp.student_snapshot?.department})
                  </h3>
                </div>
                <button
                  onClick={() => setSchedulingApp(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleScheduleInterview} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Round Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Technical Round 1 or System Design Interview"
                    value={scheduleData.round_name}
                    onChange={(e) => setScheduleData({ ...scheduleData, round_name: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleData.scheduled_at}
                      onChange={(e) => setScheduleData({ ...scheduleData, scheduled_at: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Interview Mode *
                    </label>
                    <select
                      value={scheduleData.mode}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          mode: e.target.value,
                          venue_or_link:
                            e.target.value === 'Online'
                              ? 'https://meet.google.com/xyz-placement-interview'
                              : 'Placement Cell Room 302, Academic Block A',
                        })
                      }
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Online">Online Video Call</option>
                      <option value="Offline">Offline On-Campus Venue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {scheduleData.mode === 'Online' ? 'Meeting URL (Google Meet / Teams / Zoom) *' : 'Physical Venue Location *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      scheduleData.mode === 'Online'
                        ? 'https://meet.google.com/abc-defg-hij'
                        : 'Placement Cell Hall 2, Main Admin Building'
                    }
                    value={scheduleData.venue_or_link}
                    onChange={(e) => setScheduleData({ ...scheduleData, venue_or_link: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Instructions for Candidate
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Keep college ID ready, webcam on, and be prepared to write code in an IDE."
                    value={scheduleData.instructions}
                    onChange={(e) => setScheduleData({ ...scheduleData, instructions: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Automatically transitions application to 'Interview Scheduled' and notifies the candidate.
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSchedulingApp(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSchedule}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submittingSchedule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                    Confirm & Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; TPO Applicant Review
      </footer>
    </div>
  );
}
