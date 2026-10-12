import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import {
  ShieldCheck,
  User,
  Mail,
  Key,
  Lock,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Save,
  Clock,
  Sparkles,
  Terminal
} from 'lucide-react';

export default function TpoProfile() {
  const { user } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Edit details form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setProfileData(res.data);
      setName(res.data.full_name || '');
      setEmail(res.data.email || '');
      setPhone(res.data.phone || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setMessage({ type: 'error', text: 'Full name and email address are required.' });
      return;
    }

    setSavingProfile(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiClient.put('/auth/profile', {
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      setMessage({ type: 'success', text: 'Profile details successfully updated!' });
      setProfileData({ ...profileData, ...res.data });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update profile details.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: 'Your password has been changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to change password. Verify your current password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const isSuperAdmin = profileData?.role === 'tpo_admin' || user?.role === 'tpo_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Placement Cell Officer Profile
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Manage your credentials, update your official communication email, and review your administrative authorization level.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 text-indigo-200">
                {isSuperAdmin ? 'Super Administrator' : 'Placement Staff'}
              </span>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between border animate-in fade-in duration-150 ${
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
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Identity Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-200 mb-4">
              {name
                ? name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'TP'}
            </div>

            <h2 className="text-base font-bold text-slate-900">{name || 'Administrator'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{email}</p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              {profileData?.designation || (isSuperAdmin ? 'Placement Director' : 'Placement Coordinator')}
            </div>

            <div className="w-full mt-6 pt-6 border-t border-slate-100 text-left space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">System Role</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {profileData?.role ? profileData.role.replace('_', ' ') : 'Placement Staff'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Account Status</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Authorized Modules</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {isSuperAdmin ? (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Full System Authority
                    </span>
                  ) : (
                    (profileData?.permissions || []).map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                      >
                        {p.replace('_', ' ')}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 & 3: Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Card 1: Personal Details */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <User className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Personal & Official Contact Info</h3>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / Office Extension
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Card 2: Security & Change Password */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Lock className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Change Authentication Password</h3>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password (min 6 characters) *
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Key className="h-3.5 w-3.5" />
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Card 3: System Architecture & Live Diagnostics (Admin Secret Console) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <Terminal className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      System Architecture & Live Diagnostics
                      <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                        Secret Route
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Private developer console inspecting React, FastAPI, MongoDB, and AI connectivity</p>
                  </div>
                </div>
                <Link
                  to="/admin/diagnostics"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  <Terminal className="h-3.5 w-3.5 text-purple-300" />
                  Open Live Diagnostics
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Dedicated Direct URL:</span>
                  <code className="text-[11px] bg-slate-200/70 text-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                    /admin/diagnostics
                  </code>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Removed from the public home page so students and external visitors never see internal backend telemetry. Only TPO Administrators can inspect live latency, MongoDB status, and JWT tokens here or directly via the secret URL above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
