import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Key,
  UserX,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Download,
  Upload,
  FileSpreadsheet,
  Sliders,
  RefreshCw,
  FileText,
  Phone,
  Mail,
  BookOpen,
  X,
  ShieldCheck,
  ShieldAlert,
  Check,
  Award,
  Layers,
  ChevronDown
} from 'lucide-react';

export default function TpoStudents() {
  const [searchParams] = useSearchParams();
  const initialPlacementParam = searchParams.get('placement_status') || '';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [availableCourses, setAvailableCourses] = useState([]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [placementFilter, setPlacementFilter] = useState(initialPlacementParam);
  const [activeFilter, setActiveFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  // Modal 1: Add Student State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    password: '',
    roll_number: '',
    department: 'CSE',
    branch: 'Computer Science & Engineering',
    graduation_year: 2026,
    cgpa: '',
    tenth_percentage: '',
    twelfth_percentage: '',
    phone: '',
  });

  // Modal 2: Change Password State
  const [targetStudentForPassword, setTargetStudentForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Modal 3: Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Modal 4: Registration Settings State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [regSettings, setRegSettings] = useState({
    registration_enabled: true,
    domain_restriction_enabled: false,
    allowed_email_domains: ['college.edu'],
    require_manual_verification: false,
    auto_verify_allowed_domains: true,
    closed_message: 'Student registrations are currently closed by the Placement Cell.',
  });
  const [allowedDomainsInput, setAllowedDomainsInput] = useState('college.edu');

  // Action loading states
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [verifyingUserId, setVerifyingUserId] = useState(null);

  // 1. Fetch available departments/courses
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/courses');
      if (res.data && res.data.length > 0) {
        setAvailableCourses(res.data);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  // 2. Fetch students list with server-side filters
  const fetchStudents = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (batchFilter) params.batch = parseInt(batchFilter, 10);
      if (deptFilter) params.department = deptFilter;
      if (placementFilter) params.placement_status = placementFilter;
      if (activeFilter === 'active') params.is_active = true;
      if (activeFilter === 'deactivated') params.is_active = false;

      const res = await apiClient.get('/students/all', { params });
      setStudents(res.data || []);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load students roster.',
      });
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [batchFilter, deptFilter, placementFilter, activeFilter]);

  // Debounced/instant search trigger on enter or button
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setBatchFilter('');
    setDeptFilter('');
    setPlacementFilter('');
    setActiveFilter('');
    setVerificationFilter('');
  };

  // 3. Add Student Submit
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        full_name: addForm.full_name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        roll_number: addForm.roll_number.trim() || undefined,
        department: addForm.department,
        branch: addForm.branch || addForm.department,
        graduation_year: parseInt(addForm.graduation_year, 10) || 2026,
        cgpa: addForm.cgpa ? parseFloat(addForm.cgpa) : 0.0,
        tenth_percentage: addForm.tenth_percentage ? parseFloat(addForm.tenth_percentage) : 0.0,
        twelfth_percentage: addForm.twelfth_percentage ? parseFloat(addForm.twelfth_percentage) : 0.0,
        phone: addForm.phone.trim() || '',
      };

      await apiClient.post('/students', payload);
      setMessage({
        type: 'success',
        text: `Student account for "${payload.full_name}" registered successfully!`,
      });
      setIsAddModalOpen(false);
      setAddForm({
        full_name: '',
        email: '',
        password: '',
        roll_number: '',
        department: 'CSE',
        branch: 'Computer Science & Engineering',
        graduation_year: 2026,
        cgpa: '',
        tenth_percentage: '',
        twelfth_percentage: '',
        phone: '',
      });
      fetchStudents();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to register student account.',
      });
    } finally {
      setSubmittingAdd(false);
    }
  };

  // 4. Toggle Student Active / Deactivate
  const handleToggleActiveStatus = async (student) => {
    const nextStatus = !student.is_active;
    const actionText = nextStatus ? 'activate' : 'deactivate';
    const confirmPrompt = nextStatus
      ? `Reactivate account for "${student.full_name}"? They will regain access to log into the portal.`
      : `Deactivate account for "${student.full_name}" (${student.roll_number || student.email})? They will be immediately blocked from logging in.`;

    if (!window.confirm(confirmPrompt)) return;

    setTogglingUserId(student.user_id);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.put(`/students/${student.user_id}/status`, {
        is_active: nextStatus,
        reason: nextStatus ? 'Reactivated by TPO' : 'Deactivated by TPO',
      });
      setMessage({
        type: 'success',
        text: `Student "${student.full_name}" has been ${actionText}d successfully.`,
      });
      fetchStudents();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || `Failed to ${actionText} student account.`,
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  // 5. Change / Reset Password Submit
  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
      return;
    }

    setSubmittingPassword(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.put(`/students/${targetStudentForPassword.user_id}/password`, {
        new_password: newPassword,
      });
      setMessage({
        type: 'success',
        text: `Password for "${targetStudentForPassword.full_name}" updated successfully.`,
      });
      setTargetStudentForPassword(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update student password.',
      });
    } finally {
      setSubmittingPassword(false);
    }
  };

  // 6. Download Resume
  const handleDownloadResume = async (student) => {
    try {
      const res = await apiClient.get(`/students/resume/download?student_id=${student.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${student.roll_number || student.full_name}_resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Resume file is not available on disk for this student.');
    }
  };

  // 7. Toggle Student Verification (Approve / Revoke)
  const handleToggleVerification = async (student) => {
    setVerifyingUserId(student.user_id);
    const targetStatus = !student.is_verified;
    try {
      await apiClient.put(`/students/${student.user_id}/verify`, {
        is_verified: targetStatus,
      });
      setMessage({
        type: 'success',
        text: `Student "${student.full_name}" is now ${targetStatus ? 'Verified & Approved' : 'marked as Pending Verification'}.`,
      });
      setStudents((prev) =>
        prev.map((s) => (s.user_id === student.user_id ? { ...s, is_verified: targetStatus } : s))
      );
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update student verification status.',
      });
    } finally {
      setVerifyingUserId(null);
    }
  };

  // 8. Download Bulk Import Template
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await apiClient.get('/students/bulk-import/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'placio_student_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download bulk import template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // 9. Upload Bulk Import File
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      alert('Please select an Excel (.xlsx) or CSV file to import.');
      return;
    }
    setUploadingBulk(true);
    setBulkResult(null);

    const formData = new FormData();
    formData.append('file', bulkFile);

    try {
      const res = await apiClient.post('/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkResult(res.data);
      setMessage({
        type: 'success',
        text: `Bulk Import Complete: ${res.data.enrolled_count} students successfully enrolled! (${res.data.skipped_count} skipped)`,
      });
      fetchStudents(true);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Bulk import failed. Please check the file format.',
      });
    } finally {
      setUploadingBulk(false);
    }
  };

  // 10. Open Registration Settings Modal
  const openSettingsModal = async () => {
    setIsSettingsModalOpen(true);
    setLoadingSettings(true);
    try {
      const res = await apiClient.get('/settings/registration');
      setRegSettings(res.data);
      setAllowedDomainsInput(res.data.allowed_email_domains ? res.data.allowed_email_domains.join(', ') : '');
    } catch (err) {
      console.error('Failed to load registration settings', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // 11. Save Registration Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const domains = allowedDomainsInput
        .split(',')
        .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);

      const payload = {
        registration_enabled: regSettings.registration_enabled,
        domain_restriction_enabled: regSettings.domain_restriction_enabled,
        allowed_email_domains: domains.length > 0 ? domains : ['college.edu'],
        require_manual_verification: regSettings.require_manual_verification,
        auto_verify_allowed_domains: regSettings.auto_verify_allowed_domains,
        closed_message: regSettings.closed_message || 'Student registrations are currently closed by the Placement Cell.',
      };

      const res = await apiClient.put('/settings/registration', payload);
      setRegSettings(res.data);
      setMessage({
        type: 'success',
        text: 'Student registration rules and domain verification policies updated successfully!',
      });
      setIsSettingsModalOpen(false);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update registration settings.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Fallback departments if none fetched
  const departmentOptions =
    availableCourses.length > 0
      ? availableCourses.map((c) => c.code)
      : ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'AI & DS', 'MBA', 'MCA'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar onCoursesUpdated={fetchCourses} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Status Message Toast */}
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
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Page Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Student Directory & Academic Records
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Centralized student roster management. Filter by batch, department, or roll number. Add students, toggle active login permissions, and reset student credentials.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => fetchStudents(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
              title="Reload student roster"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={openSettingsModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
              title="Configure student self-registration & email domain rules"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-600" />
              Registration Rules
            </button>
            <button
              onClick={() => {
                setBulkResult(null);
                setBulkFile(null);
                setIsBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors"
              title="Bulk import students via Excel (.xlsx) or CSV"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Bulk Import
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Student
            </button>
          </div>
        </div>

        {/* Multi-Criteria Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Roll Number, Full Name, or Email Address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchStudents();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shrink-0 w-full sm:w-auto"
            >
              Search
            </button>
          </form>

          {/* Secondary Dropdown Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <Filter className="h-3 w-3" /> Filters:
              </span>

              {/* Batch Filter */}
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Batches</option>
                <option value="2027">Batch 2027</option>
                <option value="2026">Batch 2026</option>
                <option value="2025">Batch 2025</option>
                <option value="2024">Batch 2024</option>
                <option value="2023">Batch 2023</option>
              </select>

              {/* Course / Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* Placement Filter */}
              <select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="">Placement: All</option>
                <option value="placed">Placed Only</option>
                <option value="unplaced">Unplaced Only</option>
              </select>

              {/* Verification Filter */}
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="">Verification: All</option>
                <option value="verified">Verified Only</option>
                <option value="pending">Pending Approval</option>
              </select>

              {/* Account Status Filter */}
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="">Status: All Accounts</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
              </select>

              {(batchFilter || deptFilter || placementFilter || activeFilter || verificationFilter || searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2 py-1 text-slate-500 hover:text-rose-600 hover:underline text-xs font-medium"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {students.filter((s) => {
                if (verificationFilter === 'verified') return Boolean(s.is_verified);
                if (verificationFilter === 'pending') return !s.is_verified;
                return true;
              }).length} Students Listed
            </span>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
              Loading student directory...
            </div>
          ) : students.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No students match current filter criteria.</p>
              <p className="text-slate-400 mt-1">
                Try adjusting your search query, department, or batch filter, or add a new student account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Student & Contact</th>
                    <th className="py-3 px-4">Roll & Department</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Academics (CGPA / 10th / 12th)</th>
                    <th className="py-3 px-4">Placement Status</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Account Access</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students
                    .filter((s) => {
                      if (verificationFilter === 'verified') return Boolean(s.is_verified);
                      if (verificationFilter === 'pending') return !s.is_verified;
                      return true;
                    })
                    .map((student) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        !student.is_active ? 'bg-slate-50/50 opacity-80' : ''
                      }`}
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-bold">{student.full_name}</strong>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-2.5 w-2.5 text-slate-400" /> {student.email}
                        </span>
                        {student.phone && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5 text-slate-400" /> {student.phone}
                          </span>
                        )}
                      </td>

                      {/* Roll & Department */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 block text-xs">
                          {student.roll_number || 'No Roll #'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {student.department} &bull; {student.branch}
                        </span>
                      </td>

                      {/* Batch */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {student.graduation_year}
                        </span>
                      </td>

                      {/* Academics */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">
                          CGPA: <strong className="text-indigo-600 font-black">{student.cgpa.toFixed(1)}</strong> / 10.0
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          10th: {student.tenth_percentage}% | 12th: {student.twelfth_percentage}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Backlogs: {student.active_backlogs}
                        </span>
                      </td>

                      {/* Placement Status */}
                      <td className="py-3.5 px-4">
                        {student.is_placed ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Placed
                            </span>
                            <span className="text-[11px] font-semibold text-slate-800 block mt-1 truncate max-w-[130px]">
                              {student.placement_company}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Unplaced
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {student.applications_count} drive applications
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4">
                        {student.is_verified ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Verified
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleVerification(student)}
                              disabled={verifyingUserId === student.user_id}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline ml-1"
                              title="Click to revoke verification"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              Pending
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleVerification(student)}
                              disabled={verifyingUserId === student.user_id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                              title="1-Click Approve / Verify Student"
                            >
                              {verifyingUserId === student.user_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Approve
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Account Access (Active vs Deactivated) */}
                      <td className="py-3.5 px-4">
                        {student.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="h-3 w-3" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Change Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setTargetStudentForPassword(student);
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                            title="Reset / Change student password"
                          >
                            <Key className="h-3 w-3" />
                            Password
                          </button>

                          {/* Deactivate / Activate Button */}
                          <button
                            type="button"
                            disabled={togglingUserId === student.user_id}
                            onClick={() => handleToggleActiveStatus(student)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                              student.is_active
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={student.is_active ? 'Deactivate student login access' : 'Reactivate student login access'}
                          >
                            {togglingUserId === student.user_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : student.is_active ? (
                              <UserX className="h-3 w-3" />
                            ) : (
                              <UserCheck className="h-3 w-3" />
                            )}
                            {student.is_active ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Download Resume if available */}
                          {student.has_resume && (
                            <button
                              type="button"
                              onClick={() => handleDownloadResume(student)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download student resume PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal 1: Add New Student */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    Register New Student Account
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Directly enroll a candidate into the college placement portal with login credentials.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddStudentSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={addForm.full_name}
                      onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      College Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul.sharma@college.edu"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Password * (min 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Roll Number / Registration ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 22CSE045"
                      value={addForm.roll_number}
                      onChange={(e) => setAddForm({ ...addForm, roll_number: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department / Course *
                    </label>
                    <select
                      value={addForm.department}
                      onChange={(e) => setAddForm({ ...addForm, department: e.target.value, branch: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    >
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch Specification
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={addForm.branch}
                      onChange={(e) => setAddForm({ ...addForm, branch: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Passing Batch Year *
                    </label>
                    <input
                      type="number"
                      required
                      min={2020}
                      max={2035}
                      value={addForm.graduation_year}
                      onChange={(e) => setAddForm({ ...addForm, graduation_year: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current CGPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={10}
                      placeholder="8.50"
                      value={addForm.cgpa}
                      onChange={(e) => setAddForm({ ...addForm, cgpa: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      10th %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      placeholder="90.5"
                      value={addForm.tenth_percentage}
                      onChange={(e) => setAddForm({ ...addForm, tenth_percentage: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      12th %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      placeholder="88.0"
                      value={addForm.twelfth_percentage}
                      onChange={(e) => setAddForm({ ...addForm, twelfth_percentage: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submittingAdd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {submittingAdd ? 'Registering...' : 'Register Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Change / Reset Password */}
        {targetStudentForPassword && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Key className="h-4 w-4 text-indigo-600" />
                    Reset Student Password
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For <strong>{targetStudentForPassword.full_name}</strong> ({targetStudentForPassword.email})
                  </p>
                </div>
                <button
                  onClick={() => setTargetStudentForPassword(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handlePasswordResetSubmit} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password * (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter new password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-enter new password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetStudentForPassword(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPassword || !newPassword}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submittingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                    {submittingPassword ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Bulk Student Import */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    Bulk Import Student Candidates
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload an Excel (.xlsx) or CSV file with candidate records for automated bulk account generation.
                  </p>
                </div>
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* Download Template Step */}
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Step 1: Download Standard Template</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pre-formatted columns: Full Name, College Email, Roll Number, Department, Batch, CGPA, 10th %, 12th %, Phone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors shrink-0"
                >
                  {downloadingTemplate ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download .xlsx Template
                </button>
              </div>

              {/* Upload Form Step */}
              <form onSubmit={handleBulkUpload} className="mt-5 space-y-4">
                <span className="text-xs font-bold text-slate-800 block">Step 2: Select Completed File</span>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    id="bulk-file-input"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="bulk-file-input"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    Browse Excel / CSV File
                  </label>
                  {bulkFile ? (
                    <div className="mt-3 text-xs text-slate-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg p-2 max-w-sm mx-auto">
                      Selected: <strong>{bulkFile.name}</strong> ({(bulkFile.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                    </p>
                  )}
                </div>

                {/* Import Results Box */}
                {bulkResult && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Processing Summary</span>
                      <span className="text-slate-500">Total Rows: {bulkResult.total_rows}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-[11px] text-emerald-700 block font-medium">Successfully Enrolled</span>
                        <strong className="text-lg text-emerald-800">{bulkResult.enrolled_count}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-[11px] text-amber-700 block font-medium">Skipped / Duplicates</span>
                        <strong className="text-lg text-amber-800">{bulkResult.skipped_count}</strong>
                      </div>
                    </div>
                    {bulkResult.errors && bulkResult.errors.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">
                          Skipped Items Detail ({bulkResult.errors.length}):
                        </span>
                        <div className="max-h-32 overflow-y-auto text-[11px] text-slate-600 bg-white rounded border border-slate-200 p-2 space-y-1">
                          {bulkResult.errors.map((err, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                              <span className="text-rose-600 font-semibold">Row {err.row}:</span>
                              <span>{err.reason} ({err.email})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingBulk || !bulkFile}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {uploadingBulk ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {uploadingBulk ? 'Parsing & Enrolling...' : 'Upload & Import Candidates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: Student Registration & Domain Governance Settings */}
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-indigo-600" />
                    Student Self-Registration & Domain Governance
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure public sign-up availability, allowed email domains, and verification rules.
                  </p>
                </div>
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {loadingSettings ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  Loading registration configuration...
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="mt-5 space-y-5">
                  {/* Rule 1: Portal Self-Registration Active */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">
                        Allow Student Self-Registration (/register)
                      </strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        When enabled, students can create their own account on the portal home page. When disabled, only TPO staff can enroll students.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={regSettings.registration_enabled}
                        onChange={(e) =>
                          setRegSettings({ ...regSettings, registration_enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  {/* Closed Message Notice */}
                  {!regSettings.registration_enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Notice Message Displayed to Students When Closed
                      </label>
                      <input
                        type="text"
                        value={regSettings.closed_message || ''}
                        onChange={(e) =>
                          setRegSettings({ ...regSettings, closed_message: e.target.value })
                        }
                        placeholder="Student registrations are currently closed by the Placement Cell."
                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  )}

                  {/* Rule 2: College Email Domain Enforcement */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">
                        Enforce College Email Domain Restriction
                      </strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Restrict candidate sign-ups to verified institutional email addresses (e.g., student@college.edu).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={regSettings.domain_restriction_enabled}
                        onChange={(e) =>
                          setRegSettings({ ...regSettings, domain_restriction_enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>

                  {/* Allowed Domains Input */}
                  {regSettings.domain_restriction_enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Allowed College Email Domains (Comma-separated)
                      </label>
                      <input
                        type="text"
                        value={allowedDomainsInput}
                        onChange={(e) => setAllowedDomainsInput(e.target.value)}
                        placeholder="college.edu, student.college.edu"
                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Candidates attempting to register with other domains (e.g., gmail.com) will be rejected with an informative prompt.
                      </p>
                    </div>
                  )}

                  {/* Rule 3: Verification Mode */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">
                        Require Manual TPO Approval for New Accounts
                      </strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        If checked, self-registered candidates will be tagged "Pending Approval" until a TPO Officer clicks "Approve" in the directory.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={regSettings.require_manual_verification}
                        onChange={(e) =>
                          setRegSettings({ ...regSettings, require_manual_verification: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                    </label>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSettingsModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {savingSettings ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {savingSettings ? 'Saving Policies...' : 'Save Registration Policies'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; TPO Administration Console
      </footer>
    </div>
  );
}
