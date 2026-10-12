import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Plus,
  Key,
  Sliders,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Mail,
  User,
  Briefcase,
  Layers,
  Lock,
  Calendar,
  GraduationCap,
  FileSpreadsheet,
  Bell,
  BookOpen,
  X,
  ChevronDown,
  Info
} from 'lucide-react';

const PERMISSION_METADATA = [
  {
    id: 'manage_drives',
    name: 'Manage Job Drives',
    category: 'Placement Drives',
    icon: Building2,
    description: 'Post, publish, edit, or close campus placement drives and eligibility criteria.',
  },
  {
    id: 'schedule_interviews',
    name: 'Schedule & Track Interviews',
    category: 'Interviews',
    icon: Calendar,
    description: 'Schedule interview dates/times, assign meeting links, and update interview rounds.',
  },
  {
    id: 'manage_students',
    name: 'Student Directory & Moderation',
    category: 'Students',
    icon: GraduationCap,
    description: 'Enroll student accounts, reset passwords, update verification status, or deactivate.',
  },
  {
    id: 'manage_applicants',
    name: 'Applicant Tracking (ATS)',
    category: 'Recruitment Funnel',
    icon: UserCheck,
    description: 'Move students across hiring stages (Shortlisted, Assessment, Selected, Offer).',
  },
  {
    id: 'export_data',
    name: 'Placement Reports & Excel Exports',
    category: 'Analytics & Reports',
    icon: FileSpreadsheet,
    description: 'Generate and download Excel student rosters and placement metric reports.',
  },
  {
    id: 'send_notifications',
    name: 'Broadcast Notices & Reminders',
    category: 'Communications',
    icon: Bell,
    description: 'Dispatch automated interview email reminders and broadcast system notices.',
  },
  {
    id: 'manage_courses',
    name: 'Course & Department Catalog',
    category: 'Academics',
    icon: BookOpen,
    description: 'Configure eligible degrees, departments, and academic branches.',
  },
];

const SUGGESTED_DESIGNATIONS = [
  'Placement Director',
  'Placement Officer',
  'Assistant Placement Officer',
  'Corporate Relations Lead',
  'Department Placement Coordinator (CSE)',
  'Department Placement Coordinator (IT)',
  'Department Placement Coordinator (ECE)',
  'Department Placement Coordinator (Core)',
  'Student Placement Coordinator (SPC)',
  'Placement Executive',
];

export default function TpoStaff() {
  const { user } = useAuth();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal 1: Add Staff
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'tpo_staff',
    designation: 'Assistant Placement Officer',
    permissions: ['manage_drives', 'schedule_interviews', 'manage_applicants'],
  });

  // Modal 2: Edit Access & Designation
  const [targetForAccess, setTargetForAccess] = useState(null);
  const [submittingAccess, setSubmittingAccess] = useState(false);
  const [accessForm, setAccessForm] = useState({
    full_name: '',
    role: 'tpo_staff',
    designation: '',
    permissions: [],
  });

  // Modal 3: Change Password
  const [targetForPassword, setTargetForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Modal 4: Delete Confirmation
  const [targetForDelete, setTargetForDelete] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Status toggle in progress
  const [togglingUserId, setTogglingUserId] = useState(null);

  // 1. Fetch Staff List
  const fetchStaff = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter === 'active') params.is_active = true;
      if (statusFilter === 'deactivated') params.is_active = false;

      const res = await apiClient.get('/staff', { params });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to load staff roster:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load TPO staff roster.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [roleFilter, statusFilter]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchStaff();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Open Edit Access Modal
  const handleOpenAccessModal = (staff) => {
    setTargetForAccess(staff);
    setAccessForm({
      full_name: staff.full_name || '',
      role: staff.role || 'tpo_staff',
      designation: staff.designation || 'Placement Coordinator',
      permissions: staff.permissions || [],
    });
  };

  // 3. Submit Edit Access
  const handleSaveAccess = async (e) => {
    e.preventDefault();
    if (!targetForAccess) return;

    setSubmittingAccess(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.put(`/staff/${targetForAccess.id}/access`, accessForm);
      setMessage({
        type: 'success',
        text: `Permissions & designation for ${targetForAccess.full_name} have been updated successfully!`,
      });
      setTargetForAccess(null);
      fetchStaff();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update staff access permissions.',
      });
    } finally {
      setSubmittingAccess(false);
    }
  };

  // 4. Submit Add Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!addForm.full_name || !addForm.email || !addForm.password) {
      setMessage({ type: 'error', text: 'Please fill all required fields.' });
      return;
    }
    if (addForm.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setSubmittingAdd(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.post('/staff', addForm);
      setMessage({
        type: 'success',
        text: `TPO Officer ${addForm.full_name} has been enrolled successfully!`,
      });
      setIsAddModalOpen(false);
      setAddForm({
        full_name: '',
        email: '',
        password: '',
        role: 'tpo_staff',
        designation: 'Assistant Placement Officer',
        permissions: ['manage_drives', 'schedule_interviews', 'manage_applicants'],
      });
      fetchStaff();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to enroll new staff member.',
      });
    } finally {
      setSubmittingAdd(false);
    }
  };

  // 5. Submit Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!targetForPassword) return;

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setSubmittingPassword(true);
    try {
      await apiClient.put(`/staff/${targetForPassword.id}/password`, {
        new_password: newPassword,
      });
      setMessage({
        type: 'success',
        text: `Password for ${targetForPassword.full_name} updated successfully!`,
      });
      setTargetForPassword(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to reset staff password.',
      });
    } finally {
      setSubmittingPassword(false);
    }
  };

  // 6. Toggle Status (Deactivate / Activate)
  const handleToggleStatus = async (staff) => {
    if (staff.id === user?.id) {
      setMessage({ type: 'error', text: 'Super Admin cannot deactivate their own active session.' });
      return;
    }

    const nextState = !staff.is_active;
    const confirmPrompt = nextState
      ? `Reactivate account for ${staff.full_name}? They will be able to log in immediately.`
      : `Deactivate ${staff.full_name}? They will be blocked from logging into the portal immediately.`;

    if (!window.confirm(confirmPrompt)) return;

    setTogglingUserId(staff.id);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.put(`/staff/${staff.id}/status`, { is_active: nextState });
      setMessage({
        type: 'success',
        text: `Account for ${staff.full_name} ${nextState ? 'reactivated' : 'deactivated'} successfully!`,
      });
      fetchStaff();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update account status.',
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  // 7. Delete Staff Member
  const handleDeleteStaff = async () => {
    if (!targetForDelete) return;

    setSubmittingDelete(true);
    try {
      await apiClient.delete(`/staff/${targetForDelete.id}`);
      setMessage({
        type: 'success',
        text: `Staff member ${targetForDelete.full_name} removed from placement cell successfully.`,
      });
      setTargetForDelete(null);
      fetchStaff();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to remove staff member.',
      });
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Quick stats
  const totalStaff = staffList.length;
  const totalAdmins = staffList.filter((s) => s.role === 'tpo_admin').length;
  const totalCoordinators = staffList.filter((s) => s.role === 'tpo_staff').length;
  const activeCount = staffList.filter((s) => s.is_active).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Super Admin Control Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                TPO Placement Cell Staff & Access Board
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
                Super Admin control center to manage placement officers, assign custom departmental designations, reset credentials, and configure fine-grained permissions.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => fetchStaff(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Staff Member
              </button>
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
              <p className="text-slate-400 font-medium">Total Cell Officers</p>
              <p className="text-xl font-extrabold text-white mt-0.5">{totalStaff}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
              <p className="text-purple-300 font-medium">Super Admins</p>
              <p className="text-xl font-extrabold text-purple-200 mt-0.5">{totalAdmins}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
              <p className="text-indigo-300 font-medium">Placement Coordinators</p>
              <p className="text-xl font-extrabold text-indigo-200 mt-0.5">{totalCoordinators}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
              <p className="text-emerald-300 font-medium">Active Accounts</p>
              <p className="text-xl font-extrabold text-emerald-300 mt-0.5">{activeCount}</p>
            </div>
          </div>
        </div>

        {/* Status / Alert Banner */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between border animate-in fade-in duration-200 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, email, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Roles (Admins & Staff)</option>
                <option value="tpo_admin">Super Admins Only</option>
                <option value="tpo_staff">TPO Staff Coordinators Only</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Account Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Account Statuses</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Placement Officers Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {staffList.length} registered TPO cell members
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-3" />
              <p className="text-xs font-semibold">Loading TPO staff directory...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <UserX className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No staff members found</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting search or filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Officer Details</th>
                    <th className="py-3.5 px-4">Designation & Role</th>
                    <th className="py-3.5 px-4">Special Access / Permissions</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff) => {
                    const isSelf = staff.id === user?.id;
                    const isSuper = staff.role === 'tpo_admin';
                    const active = staff.is_active;

                    return (
                      <tr
                        key={staff.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          !active ? 'bg-slate-50/40 opacity-75' : ''
                        }`}
                      >
                        {/* Column 1: Officer Info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                                isSuper
                                  ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white'
                                  : 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white'
                              }`}
                            >
                              {staff.full_name
                                ? staff.full_name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()
                                : 'TP'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">
                                  {staff.full_name}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {staff.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Designation & Role */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-slate-400" />
                              {staff.designation || (isSuper ? 'Super Admin / Director' : 'Placement Coordinator')}
                            </div>
                            <div>
                              {isSuper ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  <ShieldCheck className="h-3 w-3 text-purple-600" /> Super Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <UserCheck className="h-3 w-3 text-indigo-600" /> TPO Staff Coordinator
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Special Access & Permissions */}
                        <td className="py-4 px-4 max-w-xs">
                          {isSuper ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                              Unrestricted Super Admin Privileges
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {(staff.permissions || []).length > 0 ? (
                                  staff.permissions.map((pId) => {
                                    const meta = PERMISSION_METADATA.find((m) => m.id === pId);
                                    return (
                                      <span
                                        key={pId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                        title={meta?.description || pId}
                                      >
                                        {meta?.name || pId}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    No granular access assigned
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {(staff.permissions || []).length} of {PERMISSION_METADATA.length} modules unlocked
                              </p>
                            </div>
                          )}
                        </td>

                        {/* Column 4: Account Status */}
                        <td className="py-4 px-4">
                          {active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Deactivated
                            </span>
                          )}
                        </td>

                        {/* Column 5: Action Buttons */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Access / Designation */}
                            <button
                              onClick={() => handleOpenAccessModal(staff)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                              title="Edit Designation & Granular Permissions"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                            </button>

                            {/* Change Password */}
                            <button
                              onClick={() => {
                                setTargetForPassword(staff);
                                setNewPassword('');
                                setConfirmPassword('');
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                              title="Change Password"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </button>

                            {/* Deactivate / Reactivate Toggle */}
                            <button
                              onClick={() => handleToggleStatus(staff)}
                              disabled={isSelf || togglingUserId === staff.id}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed text-slate-400 border-slate-200'
                                  : active
                                  ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-slate-200 hover:border-rose-200'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200 hover:border-emerald-200'
                              }`}
                              title={
                                isSelf
                                  ? 'You cannot deactivate your own account'
                                  : active
                                  ? 'Deactivate Account'
                                  : 'Reactivate Account'
                              }
                            >
                              {active ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* Remove / Delete Staff Member */}
                            <button
                              onClick={() => setTargetForDelete(staff)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed text-slate-400 border-slate-200'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200'
                              }`}
                              title={
                                isSelf
                                  ? 'You cannot remove your own account'
                                  : 'Remove staff member from cell'
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD STAFF MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Placement Officer</h3>
                  <p className="text-xs text-slate-500">Enroll a coordinator or administrator into the cell</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={addForm.full_name}
                    onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official College Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="r.sharma@tpo.college.edu"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Authority Role
                  </label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="tpo_staff">TPO Staff Coordinator</option>
                    <option value="tpo_admin">TPO Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assistant Placement Officer"
                  value={addForm.designation}
                  onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTED_DESIGNATIONS.slice(0, 5).map((sug) => (
                    <button
                      type="button"
                      key={sug}
                      onClick={() => setAddForm({ ...addForm, designation: sug })}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Permissions Matrix */}
              {addForm.role === 'tpo_staff' && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Granular Special Access Permissions
                    </label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setAddForm({
                            ...addForm,
                            permissions: PERMISSION_METADATA.map((m) => m.id),
                          })
                        }
                        className="text-purple-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setAddForm({ ...addForm, permissions: [] })}
                        className="text-slate-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {PERMISSION_METADATA.map((meta) => {
                      const Icon = meta.icon;
                      const isChecked = addForm.permissions.includes(meta.id);
                      return (
                        <label
                          key={meta.id}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-purple-50/50 border-purple-200 text-purple-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAddForm({
                                  ...addForm,
                                  permissions: [...addForm.permissions, meta.id],
                                });
                              } else {
                                setAddForm({
                                  ...addForm,
                                  permissions: addForm.permissions.filter((id) => id !== meta.id),
                                });
                              }
                            }}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Icon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span>{meta.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({meta.category})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {meta.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingAdd ? 'Enrolling...' : 'Enroll Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ACCESS & DESIGNATION */}
      {targetForAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Designation & Special Access
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modifying {targetForAccess.full_name} ({targetForAccess.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetForAccess(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccess} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Officer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={accessForm.full_name}
                    onChange={(e) =>
                      setAccessForm({ ...accessForm, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Authority Role
                  </label>
                  <select
                    value={accessForm.role}
                    onChange={(e) => setAccessForm({ ...accessForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="tpo_staff">TPO Staff Coordinator</option>
                    <option value="tpo_admin">TPO Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assistant Placement Officer"
                  value={accessForm.designation}
                  onChange={(e) =>
                    setAccessForm({ ...accessForm, designation: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTED_DESIGNATIONS.map((sug) => (
                    <button
                      type="button"
                      key={sug}
                      onClick={() => setAccessForm({ ...accessForm, designation: sug })}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions list */}
              {accessForm.role === 'tpo_staff' ? (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Granular Special Access Permissions
                    </label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setAccessForm({
                            ...accessForm,
                            permissions: PERMISSION_METADATA.map((m) => m.id),
                          })
                        }
                        className="text-purple-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setAccessForm({ ...accessForm, permissions: [] })}
                        className="text-slate-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {PERMISSION_METADATA.map((meta) => {
                      const Icon = meta.icon;
                      const isChecked = accessForm.permissions.includes(meta.id);
                      return (
                        <label
                          key={meta.id}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-purple-50/50 border-purple-200 text-purple-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAccessForm({
                                  ...accessForm,
                                  permissions: [...accessForm.permissions, meta.id],
                                });
                              } else {
                                setAccessForm({
                                  ...accessForm,
                                  permissions: accessForm.permissions.filter((id) => id !== meta.id),
                                });
                              }
                            }}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Icon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span>{meta.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({meta.category})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {meta.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>
                    Super Admin role automatically possesses all permissions across the entire placement portal.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTargetForAccess(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAccess}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingAccess ? 'Saving...' : 'Save Privileges'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHANGE PASSWORD */}
      {targetForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Staff Password</h3>
                  <p className="text-xs text-slate-500">For {targetForPassword.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setTargetForPassword(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTargetForPassword(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {targetForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Staff Member</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-slate-900">{targetForDelete.full_name}</strong> (
              <span className="font-mono text-slate-700">{targetForDelete.email}</span>) from the
              placement cell administration? They will immediately lose all access to the system.
            </p>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTargetForDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={submittingDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submittingDelete ? 'Removing...' : 'Permanently Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
