import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import CourseManagerModal from './CourseManagerModal';
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  FileText,
  User,
  BookOpen,
  Briefcase,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export default function Navbar({ onCoursesUpdated }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTpo = user?.role === 'tpo_admin' || user?.role === 'tpo_staff';
  const isSuperAdmin = user?.role === 'tpo_admin';
  const currentPath = location.pathname;

  // Home route based on role
  const homeRoute = isTpo ? '/tpo/dashboard' : '/student/dashboard';

  // Navigation Items
  const tpoNavItems = [
    { label: 'Dashboard', shortLabel: 'Dashboard', path: '/tpo/dashboard', icon: LayoutDashboard },
    { label: 'Students', shortLabel: 'Students', path: '/tpo/students', icon: GraduationCap },
    { label: 'Drives', shortLabel: 'Drives', path: '/tpo/jobs', icon: Building2 },
    { label: 'Applicants', shortLabel: 'Applicants', path: '/tpo/applicants', icon: Users },
    { label: 'Interviews', shortLabel: 'Interviews', path: '/tpo/interviews', icon: Calendar },
    ...(isSuperAdmin ? [{ label: 'TPO Team', shortLabel: 'Team', path: '/tpo/staff', icon: ShieldCheck }] : []),
  ];

  const studentNavItems = [
    { label: 'Dashboard', shortLabel: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Drives', shortLabel: 'Drives', path: '/student/jobs', icon: Briefcase },
    { label: 'Applications', shortLabel: 'Applied', path: '/student/applications', icon: FileText },
    { label: 'Interviews', shortLabel: 'Interviews', path: '/student/interviews', icon: Calendar },
    { label: 'Profile & AI', shortLabel: 'Profile', path: '/student/profile', icon: User },
  ];

  const navItems = isTpo ? tpoNavItems : studentNavItems;

  const isActive = (path) => {
    if (path === '/tpo/dashboard' && (currentPath === '/tpo' || currentPath === '/tpo/dashboard')) return true;
    if (path === '/student/dashboard' && (currentPath === '/student' || currentPath === '/student/dashboard')) return true;
    return currentPath === path;
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 xl:px-6">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-2 shrink-0">
              <Link to={homeRoute} className="flex items-center gap-2 group">
                <img
                  src="/placio-symbol.png"
                  alt="PLACIO"
                  className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
                />
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                    PLACIO
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-200/60 uppercase">
                    {isTpo ? (isSuperAdmin ? 'Admin' : 'TPO') : 'Student'}
                  </span>
                  <span className="hidden 2xl:block text-[9px] text-slate-400 font-medium tracking-tight ml-1">
                    • TRAIN • APPLY • GET PLACED
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1 xl:gap-1.5 px-2 xl:px-2.5 py-1 xl:py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden">{item.shortLabel || item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Notifications, User Role Pill, Sign Out */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <NotificationBell />

              {/* User Identity / Role Pill -> Links to Profile & Settings */}
              <Link
                to={isTpo ? '/tpo/profile' : '/student/profile'}
                className="inline-flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap shrink-0 transition-colors"
                title={`${isTpo ? (isSuperAdmin ? 'Super Admin' : 'TPO Staff') : 'Student Profile'}: Click for Settings`}
              >
                {isTpo ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span className="hidden xl:inline">{isSuperAdmin ? 'Super Admin' : 'TPO Staff'}</span>
                    <span className="xl:hidden">{isSuperAdmin ? 'Admin' : 'Staff'}</span>
                  </>
                ) : (
                  <>
                    <div className="h-4 w-4 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {user?.full_name?.charAt(0) || 'S'}
                    </div>
                    <span className="hidden xl:inline">Profile</span>
                  </>
                )}
              </Link>

              {/* Sign Out Button */}
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 px-2 xl:px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                title="Sign Out of Session"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}

            {isTpo && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsCourseModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
              >
                <BookOpen className="h-4 w-4 text-indigo-500" />
                Manage Courses & Branches
              </button>
            )}

            <Link
              to={isTpo ? '/tpo/profile' : '/student/profile'}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <User className="h-4 w-4 text-purple-600" />
              My Profile & Credentials
            </Link>

            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-2">
              <span className="font-semibold text-slate-800">{user?.full_name}</span>
              <span className="text-[11px] capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        )}
      </header>

      {/* Course Management Modal */}
      <CourseManagerModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onCoursesUpdated={onCoursesUpdated}
      />
    </>
  );
}
