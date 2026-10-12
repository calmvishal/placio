import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import CourseManagerModal from '../components/CourseManagerModal';
import {
  GraduationCap,
  PlusCircle,
  Building2,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  Briefcase,
  FileSpreadsheet,
  BookOpen,
  Search,
  X,
  ArrowUpDown,
  Filter,
  RotateCcw
} from 'lucide-react';

export default function TpoJobs() {
  const [jobs, setJobs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'closed'
  const [sortBy, setSortBy] = useState('date_newest'); // 'date_newest' | 'date_oldest' | 'deadline_near' | 'deadline_far'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [customBatch, setCustomBatch] = useState('');

  // Default deadline 14 days in the future
  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  const getInitialForm = () => ({
    company_name: '',
    title: '',
    description: '',
    job_type: 'Full-Time',
    required_branches: [],
    min_cgpa: '',
    graduation_year: 2026,
    eligible_batches: [2026],
    max_active_backlogs: 0,
    required_skills: [],
    skills_text: '',
    location: '',
    work_mode: 'On-site',
    salary_package: '',
    application_deadline: defaultDeadline(),
    status: 'published',
  });

  const [formData, setFormData] = useState(getInitialForm());

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/jobs');
      setJobs(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load placement drives.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/courses');
      setCourses(res.data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchCourses();
  }, []);

  const handleBranchToggle = (branchCode) => {
    setFormData((prev) => {
      const exists = prev.required_branches.includes(branchCode);
      return {
        ...prev,
        required_branches: exists
          ? prev.required_branches.filter((b) => b !== branchCode)
          : [...prev.required_branches, branchCode],
      };
    });
  };

  const handleBatchToggle = (year) => {
    setFormData((prev) => {
      const cur = prev.eligible_batches || [2026];
      const exists = cur.includes(year);
      let updated = exists ? cur.filter((y) => y !== year) : [...cur, year];
      if (updated.length === 0) updated = [year]; // Keep at least one
      return {
        ...prev,
        eligible_batches: updated,
        graduation_year: updated[0]
      };
    });
  };

  const handleAddCustomBatch = () => {
    const yr = parseInt(customBatch, 10);
    if (!isNaN(yr) && yr >= 2020 && yr <= 2035) {
      handleBatchToggle(yr);
      setCustomBatch('');
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const parsedCgpa = parseFloat(formData.min_cgpa);
      const parsedBacklogs = parseInt(formData.max_active_backlogs, 10);
      const batches = formData.eligible_batches && formData.eligible_batches.length > 0
        ? formData.eligible_batches
        : [parseInt(formData.graduation_year, 10) || 2026];

      let deadlineIso;
      try {
        deadlineIso = formData.application_deadline
          ? new Date(formData.application_deadline).toISOString()
          : new Date(Date.now() + 14 * 86400000).toISOString();
      } catch {
        deadlineIso = new Date(Date.now() + 14 * 86400000).toISOString();
      }

      const skillsList = formData.skills_text
        ? formData.skills_text
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : (formData.required_skills || []);

      const payload = {
        company_name: formData.company_name.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || 'Recruitment drive opportunity',
        job_type: formData.job_type,
        required_branches:
          formData.required_branches && formData.required_branches.length > 0
            ? formData.required_branches
            : availableBranches.map((b) => b.code),
        min_cgpa: isNaN(parsedCgpa) ? 0.0 : parsedCgpa,
        graduation_year: batches[0],
        eligible_batches: batches,
        max_active_backlogs: isNaN(parsedBacklogs) ? 0 : parsedBacklogs,
        required_skills: skillsList,
        location: formData.location.trim() || 'Campus / To be announced',
        work_mode: formData.work_mode,
        salary_package: formData.salary_package.trim() || 'Disclosed during interview',
        application_deadline: deadlineIso,
        status: formData.status || 'published',
      };

      await apiClient.post('/jobs', payload);
      setMessage({
        type: 'success',
        text: `Placement drive for '${formData.company_name}' published successfully!`,
      });
      setShowCreateModal(false);
      setFormData(getInitialForm());
      fetchJobs();
    } catch (err) {
      let errorText = 'Failed to create placement opportunity.';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorText = err.response.data.detail.map((e) => e.msg || e.message).join(' | ');
        } else {
          errorText = err.response.data.detail;
        }
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (jobId, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'closed' : 'published';
    try {
      await apiClient.put(`/jobs/${jobId}`, { status: newStatus });
      fetchJobs();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update job status.' });
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this placement drive?')) return;
    try {
      await apiClient.delete(`/jobs/${jobId}`);
      setMessage({ type: 'success', text: 'Drive deleted.' });
      fetchJobs();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting drive.' });
    }
  };

  const handleExportJobExcel = async (jobId, companyName) => {
    try {
      const res = await apiClient.get(`/exports/applications/${jobId}/excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${companyName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Applicants.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export Excel file for this drive.' });
    }
  };


  const availableBranches = courses.length > 0
    ? courses
    : [
        { code: 'CSE', name: 'Computer Science & Engineering' },
        { code: 'IT', name: 'Information Technology' },
        { code: 'ECE', name: 'Electronics & Communication' },
        { code: 'EEE', name: 'Electrical & Electronics' },
        { code: 'MECH', name: 'Mechanical Engineering' },
        { code: 'CIVIL', name: 'Civil Engineering' },
        { code: 'AIDS', name: 'AI & Data Science' }
      ];

  const publishedCount = jobs.filter((j) => j.status === 'published').length;
  const closedCount = jobs.filter((j) => j.status === 'closed').length;

  const getTime = (val) => {
    if (!val) return 0;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  };

  const filteredJobs = jobs
    .filter((job) => {
      // 1. Status Filter
      if (statusFilter === 'published' && job.status !== 'published') return false;
      if (statusFilter === 'closed' && job.status !== 'closed') return false;

      // 2. Keyword Search
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      const company = (job.company_name || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      const location = (job.location || '').toLowerCase();
      const skills = (job.required_skills || []).join(' ').toLowerCase();
      const branches = (job.required_branches || []).join(' ').toLowerCase();
      const batches = (job.eligible_batches || []).join(' ').toLowerCase();
      const jobType = (job.job_type || '').toLowerCase();
      return (
        company.includes(q) ||
        title.includes(q) ||
        location.includes(q) ||
        skills.includes(q) ||
        branches.includes(q) ||
        batches.includes(q) ||
        jobType.includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date_newest') {
        return getTime(b.created_at) - getTime(a.created_at);
      }
      if (sortBy === 'date_oldest') {
        return getTime(a.created_at) - getTime(b.created_at);
      }
      if (sortBy === 'deadline_near') {
        return getTime(a.application_deadline) - getTime(b.application_deadline);
      }
      if (sortBy === 'deadline_far') {
        return getTime(b.application_deadline) - getTime(a.application_deadline);
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar onCoursesUpdated={fetchCourses} />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Workspace Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Drive Management
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {jobs.length} Total Drives
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Placement Drives & Eligibility Engine
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Post recruitment drives, specify multiple eligible batches, configure department cutoffs, and monitor student application counts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCourseModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
              Manage Courses
            </button>
            <button
              onClick={() => {
                setFormData(getInitialForm());
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Post Placement Drive
            </button>
          </div>
        </div>

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
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="flex-1 font-medium">{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>
        )}

        {/* Drives Catalog List */}
        <div className="space-y-4">
          {/* Multi-Filter & Search Bar Console */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
            {/* Top Row: Search Input + Sort Dropdown */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Company Search Input */}
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by company name, job role, skills, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-500 hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="date_newest">Published: Newest First</option>
                    <option value="date_oldest">Published: Oldest First</option>
                    <option value="deadline_near">Deadline: Near First (Urgent)</option>
                    <option value="deadline_far">Deadline: Far First</option>
                  </select>
                </div>

                {/* Reset Filters Button */}
                {(searchTerm || statusFilter !== 'all' || sortBy !== 'date_newest') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setSortBy('date_newest');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer shrink-0"
                    title="Reset all filters to default"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row: Status Filter Pills + Counter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                  Status:
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Drives ({jobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('published')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'published'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active ({publishedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('closed')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'closed'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Closed ({closedCount})
                </button>
              </div>

              {/* Matching Count Summary */}
              <div className="text-[11px] text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredJobs.length}</strong> of{' '}
                <strong className="text-slate-800">{jobs.length}</strong> drives
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
              Loading placement opportunities...
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No recruitment drives posted yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "Post Placement Drive" above to create an opportunity with eligibility rules.
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Search className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No placement drives found matching your filter criteria.</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with another company name, or reset your status and search filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSortBy('date_newest');
                }}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base text-slate-900">{job.company_name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            job.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {job.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                          {job.job_type}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl line-clamp-2">{job.description}</p>

                      {/* Criteria Highlights */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                          <strong>CTC:</strong> {job.salary_package}
                        </span>
                        <span>&bull;</span>
                        <span>
                          <strong>Min CGPA:</strong> {job.min_cgpa.toFixed(1)}
                        </span>
                        <span>&bull;</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                          <strong>Batches:</strong>{' '}
                          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold text-[11px]">
                            {job.eligible_batches && job.eligible_batches.length > 0
                              ? job.eligible_batches.join(', ')
                              : job.graduation_year}
                          </span>
                        </span>
                        <span>&bull;</span>
                        <span>
                          <strong>Branches:</strong> {job.required_branches?.join(', ') || 'All'}
                        </span>
                        <span>&bull;</span>
                        <span>
                          <strong>Max Backlogs:</strong> {job.max_active_backlogs}
                        </span>
                      </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                        <strong>{job.applicants_count || 0}</strong> Applicants
                      </div>
                      <div className="flex flex-col sm:items-end text-[11px] gap-0.5">
                        <span className="text-slate-400">
                          Published: {job.created_at ? new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </span>
                        <span className={new Date(job.application_deadline) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium'}>
                          Deadline: {new Date(job.application_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Link
                          to="/tpo/applicants"
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Users className="h-3 w-3" />
                          Applicants
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleExportJobExcel(job.id, job.company_name)}
                          className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Download genuine Microsoft Excel (.xlsx) roster"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(job.id, job.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            job.status === 'published'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {job.status === 'published' ? 'Close Drive' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Placement Drive */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Post New Placement Drive</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define recruitment details, multi-batch eligibility, and course policies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(getInitialForm())}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Clear all fields"
                  >
                    Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google, Amazon, TCS, Infosys"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Job Role Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Engineer, Associate Analyst"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Salary / CTC Package *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12 LPA, 50,000/month"
                      value={formData.salary_package}
                      onChange={(e) => setFormData({ ...formData, salary_package: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Job Type
                    </label>
                    <select
                      value={formData.job_type}
                      onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Internship">Internship</option>
                      <option value="Internship+PPO">Internship + PPO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Work Mode
                    </label>
                    <select
                      value={formData.work_mode}
                      onChange={(e) => setFormData({ ...formData, work_mode: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </div>

                {/* Deterministic Eligibility Rules Grid */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Deterministic Eligibility Rules
                    </span>
                    <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Multi-Batch & Branch Enabled
                    </span>
                  </div>

                  {/* Multiple Eligible Batches Selection */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      Eligible Graduation Batches (Click to select 1 or more)
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {[2023, 2024, 2025, 2026, 2027, 2028].map((year) => {
                        const isSelected = formData.eligible_batches?.includes(year);
                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => handleBatchToggle(year)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {year} {isSelected && '✓'}
                          </button>
                        );
                      })}

                      {/* Custom batch year input */}
                      <div className="flex items-center gap-1 ml-1">
                        <input
                          type="number"
                          placeholder="Other year"
                          value={customBatch}
                          onChange={(e) => setCustomBatch(e.target.value)}
                          className="w-20 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomBatch}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Selected Batches:{' '}
                      <strong className="text-slate-800">
                        {formData.eligible_batches?.join(', ') || '2026'}
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Minimum CGPA (0.0 to 10.0)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="e.g. 7.0 (leave blank for no cutoff)"
                        value={formData.min_cgpa}
                        onChange={(e) => setFormData({ ...formData, min_cgpa: e.target.value })}
                        className="block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Maximum Allowed Active Backlogs
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.max_active_backlogs}
                        onChange={(e) => setFormData({ ...formData, max_active_backlogs: e.target.value })}
                        className="block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Dynamic Department / Course Selection */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Eligible Departments ({formData.required_branches.length} selected)
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              required_branches: availableBranches.map((c) => c.code),
                            }))
                          }
                          className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              required_branches: [],
                            }))
                          }
                          className="text-[10px] text-slate-500 hover:underline font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCourseModal(true)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        + Add/Manage Courses
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {availableBranches.map((c) => {
                        const isSelected = formData.required_branches.includes(c.code);
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleBranchToggle(c.code)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                            title={c.name}
                          >
                            {c.code} {isSelected && '✓'}
                          </button>
                        );
                      })}
                    </div>
                    {formData.required_branches.length === 0 && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        No specific branch selected — all branches will be eligible by default.
                      </p>
                    )}
                  </div>
                </div>

                {/* Required Skills & Technologies */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Required Skills & Technologies (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Python, SQL, React, Communication, System Design (comma-separated)"
                    value={formData.skills_text || ''}
                    onChange={(e) => setFormData({ ...formData, skills_text: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Enter relevant skills separated by commas to guide AI candidate matching.
                  </p>
                </div>

                {/* Deadline & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Application Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.application_deadline}
                      onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Job Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru, Pune, Hyderabad, or Remote"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Job Description & Role Responsibilities
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed job requirements, selection stages, or special instructions..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Publish Drive
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Course Management Modal */}
      <CourseManagerModal
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        onCoursesUpdated={fetchCourses}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; TPO Administrator Workspace
      </footer>
    </div>
  );
}
