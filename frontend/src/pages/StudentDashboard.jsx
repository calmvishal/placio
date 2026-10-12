import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import {
  GraduationCap,
  Briefcase,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Edit3,
  Award,
  AlertTriangle,
  Code,
  PartyPopper,
  Video,
  MapPin,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const [profileRes, analyticsRes, appsRes, interviewRes] = await Promise.allSettled([
          apiClient.get('/students/profile'),
          apiClient.get('/analytics/student-summary'),
          apiClient.get('/applications/my'),
          apiClient.get('/interviews/my')
        ]);

        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value.data);
        }
        if (analyticsRes.status === 'fulfilled') {
          setAnalytics(analyticsRes.value.data);
        }
        if (appsRes.status === 'fulfilled') {
          setMyApplications(appsRes.value.data || []);
        }
        if (interviewRes.status === 'fulfilled') {
          const allInterviews = interviewRes.value.data || [];
          const scheduled = allInterviews.filter(
            (i) => i.outcome === 'Pending' || i.status === 'scheduled' || !i.outcome
          );
          setUpcomingInterviews(scheduled);
        }
      } catch (err) {
        console.error('Failed to load student dashboard telemetry:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  // Compute live actual metrics (derives from either raw applications or analytics)
  const totalApplied = myApplications.length > 0
    ? myApplications.length
    : (analytics?.total_applied ?? 0);

  const selectedOffers = myApplications.length > 0
    ? myApplications.filter((a) => a.status === 'Selected').length
    : (analytics?.selected_count ?? 0);

  const inPipeline = myApplications.length > 0
    ? myApplications.filter((a) =>
        ['Under Review', 'Shortlisted', 'Assessment', 'Interview Scheduled'].includes(a.status)
      ).length
    : (
        (analytics?.under_review_count || 0) +
        (analytics?.shortlisted_count || 0) +
        (analytics?.assessment_count || 0) +
        (analytics?.interview_scheduled_count || 0)
      );

  // Collect scheduled interviews directly from applications if /interviews/my was empty
  const appsWithInterviews = myApplications
    .filter((a) => a.interview_details && (a.interview_details.outcome === 'Pending' || !a.interview_details.outcome))
    .map((a) => ({
      id: a.interview_details.id || a.id,
      company_name: a.company_name,
      job_title: a.job_title,
      round_name: a.interview_details.round_name || 'Technical Round 1',
      scheduled_at: a.interview_details.scheduled_at,
      mode: a.interview_details.mode || 'Online',
      venue_or_link: a.interview_details.venue_or_link || '',
      instructions: a.interview_details.instructions,
      outcome: a.interview_details.outcome || 'Pending',
    }));

  const activeInterviews = upcomingInterviews.length > 0 ? upcomingInterviews : appsWithInterviews;

  const interviewCount = activeInterviews.length > 0
    ? activeInterviews.length
    : (analytics?.upcoming_interviews_count ?? 0);

  const hasOffer = selectedOffers > 0;
  const hasResume = Boolean(profile?.has_resume || profile?.resume_filename);
  const completionScore = profile?.completion_percentage || analytics?.profile_completion || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar />

      {/* Main Student Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Placement Offer Congratulations Ribbon */}
        {hasOffer && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                <PartyPopper className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">
                  Congratulations! You have {selectedOffers} Placement Offer{selectedOffers > 1 ? 's' : ''}!
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Your hard work and preparation have paid off. Check your applications for details.
                </p>
              </div>
            </div>
            <Link
              to="/student/applications"
              className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-colors shrink-0"
            >
              View Offer &rarr;
            </Link>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.full_name}!
              </h1>
              <p className="text-indigo-200 text-sm mt-1 max-w-xl">
                Department of {profile?.department || 'CSE'} &bull; Passing Batch {profile?.graduation_year || 2026}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <Link
                to="/student/profile"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 shadow-sm transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                Edit Profile & AI Resume
              </Link>
              <span className="text-indigo-300 text-[11px]">
                Profile Completeness: <strong className="text-white">{completionScore}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Profile Completeness Alert if < 70% */}
        {!loading && completionScore < 70 && (
          <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block">Your placement profile is incomplete ({completionScore}%)</strong>
                <span className="text-amber-800">
                  Update your CGPA, 10th/12th percentages, technical skills, and resume PDF so companies can verify your eligibility.
                </span>
              </div>
            </div>
            <Link
              to="/student/profile"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors shrink-0"
            >
              Complete Now &rarr;
            </Link>
          </div>
        )}

        {/* Real-time Actual Recruitment Funnel Metrics (4 Clickable KPI Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Link
            to="/student/applications"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to view all submitted drives in My Applications"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                Drives Applied
              </span>
              <FileText className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-600" /> : totalApplied}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Submitted applications</span>
              <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View &rarr;</span>
            </p>
          </Link>

          <Link
            to="/student/applications"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to inspect active stages in My Applications pipeline"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                In Pipeline
              </span>
              <Clock className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-amber-600" /> : inPipeline}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Review / Shortlisted / Assessment</span>
              <span className="text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Track &rarr;</span>
            </p>
          </Link>

          <Link
            to="/student/interviews"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to access upcoming rounds and meeting links"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-purple-600 transition-colors">
                Upcoming Interviews
              </span>
              <Calendar className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-purple-600" /> : interviewCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Scheduled rounds & links</span>
              <span className="text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Open &rarr;</span>
            </p>
          </Link>

          <Link
            to="/student/applications"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to view selections and offers in My Applications"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                Offers (Selected)
              </span>
              <CheckCircle className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-600" /> : selectedOffers}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Final placement selections</span>
              <span className="text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View &rarr;</span>
            </p>
          </Link>
        </div>

        {/* Upcoming Interview Alerts Section (if any scheduled) */}
        {activeInterviews.length > 0 && (
          <div className="mb-8 bg-white border border-purple-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">
                  Scheduled Interview Rounds ({activeInterviews.length})
                </h3>
              </div>
              <Link
                to="/student/interviews"
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                View all rounds <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {activeInterviews.slice(0, 3).map((item) => {
                const roundTitle = item.round_name || item.round_type || 'Interview Round';
                const scheduledDate = item.scheduled_at || item.scheduled_time;
                const linkOrVenue = item.venue_or_link || item.meeting_link || item.venue || '';
                const isOnline = item.mode === 'Online' || linkOrVenue.startsWith('http');

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.company_name}</span>
                        {item.job_title && (
                          <span className="text-[11px] text-slate-500 font-medium">({item.job_title})</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-md bg-purple-200/70 text-purple-900 font-semibold">
                          {roundTitle}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                        {scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-purple-600" />
                            {new Date(scheduledDate).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        )}
                        {isOnline ? (
                          <span className="flex items-center gap-1 text-purple-700 font-medium">
                            <Video className="h-3.5 w-3.5" /> Online Video Call
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" /> {linkOrVenue || 'Campus Venue'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOnline && linkOrVenue.startsWith('http') ? (
                        <a
                          href={linkOrVenue}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-xs"
                        >
                          Join Meeting <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                      <Link
                        to="/student/interviews"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 font-semibold text-xs transition-colors"
                      >
                        Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Academic & Verification Profile Snapshot (Clickable to /student/profile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            to="/student/profile"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to view and update your academic CGPA in Profile"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                Current CGPA
              </span>
              <Award className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {profile?.cgpa ? Number(profile.cgpa).toFixed(2) : 'Not Set'}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>10-point academic scale</span>
              <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Edit &rarr;</span>
            </p>
          </Link>

          <Link
            to="/student/profile"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to view and update active backlog details in Profile"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-rose-600 transition-colors">
                Active Backlogs
              </span>
              <AlertTriangle
                className={`h-5 w-5 ${profile?.active_backlogs > 0 ? 'text-rose-500' : 'text-emerald-500'} group-hover:scale-110 transition-transform`}
              />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {profile?.active_backlogs ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Standing active backlogs</span>
              <span className="text-rose-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Update &rarr;</span>
            </p>
          </Link>

          <Link
            to="/student/profile"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to manage technical skills in Profile"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                Technical Skills
              </span>
              <Code className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {profile?.skills?.length ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Verified technical skills</span>
              <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Manage &rarr;</span>
            </p>
          </Link>

          <Link
            to="/student/profile"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group block cursor-pointer"
            title="Click to upload or parse resume PDF in Profile"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                Resume PDF
              </span>
              <FileText
                className={`h-5 w-5 ${hasResume ? 'text-emerald-500' : 'text-slate-400'} group-hover:scale-110 transition-transform`}
              />
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">
              {hasResume ? 'Uploaded & Parsed' : 'Not Uploaded'}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{hasResume ? 'Ready for AI matching' : 'Upload PDF in profile'}</span>
              <span className="text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Upload &rarr;</span>
            </p>
          </Link>
        </div>

        {/* Student Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/student/jobs"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3.5 group"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                <span>Placement Drives</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Explore open campus drives, verify rule eligibility, and apply.
              </p>
            </div>
          </Link>

          <Link
            to="/student/applications"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3.5 group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                <span>My Applications</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Track recruitment progress, status audit logs, and frozen snapshots.
              </p>
            </div>
          </Link>

          <Link
            to="/student/interviews"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3.5 group"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                <span>Interview Rounds</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Access meeting links, campus venues, guidelines, and round results.
              </p>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; Student Session Active
      </footer>
    </div>
  );
}
