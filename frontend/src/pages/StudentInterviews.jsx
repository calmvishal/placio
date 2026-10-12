import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import NotificationBell from '../components/NotificationBell';
import Navbar from '../components/Navbar';
import {
  GraduationCap,
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Briefcase,
  FileText,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';

export default function StudentInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/interviews/my');
      setInterviews(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load your interview schedules.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'Cleared':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Cleared
          </span>
        );
      case 'Not Cleared':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Not Cleared
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Absent
          </span>
        );
      case 'Rescheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Rescheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="h-3 w-3" /> Scheduled / Pending
          </span>
        );
    }
  };

  const upcomingCount = interviews.filter((i) => i.outcome === 'Pending').length;
  const clearedCount = interviews.filter((i) => i.outcome === 'Cleared').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Workspace Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Evaluation Rounds
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {interviews.length} Scheduled Rounds
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Interview Schedules & Instructions
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Access virtual meeting links, campus venue locations, round instructions, and evaluation outcomes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-bold text-xs">
              {upcomingCount} Pending
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
              {clearedCount} Cleared
            </span>
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
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Scheduled Rounds
              </span>
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{interviews.length}</div>
            <p className="text-xs text-slate-500 mt-1">Interviews organized by placement cell</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Upcoming / Pending
              </span>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-600">{upcomingCount}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting interview / evaluation</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cleared Rounds
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600">{clearedCount}</div>
            <p className="text-xs text-slate-500 mt-1">Successfully passed interview rounds</p>
          </div>
        </div>

        {/* Interviews Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Recruitment Rounds Schedule
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {interviews.length} Total
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
              Loading your interview schedules...
            </div>
          ) : interviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No interviews currently scheduled.</p>
              <p className="text-slate-400 mt-1">
                When companies review your application and schedule rounds, details and meeting links will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-extrabold text-slate-900">{item.company_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                          {item.job_title}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">&bull; {item.salary_package}</span>
                      </div>
                      <h3 className="text-sm font-bold text-indigo-600 flex items-center gap-1.5 mt-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        {item.round_name}
                      </h3>
                    </div>

                    <div className="shrink-0">{getOutcomeBadge(item.outcome)}</div>
                  </div>

                  {/* Date, Time & Venue Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-indigo-600 shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Date & Time</span>
                        <strong className="text-slate-900 text-sm">
                          {new Date(item.scheduled_at).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </strong>
                        <span className="block text-slate-600 font-medium">
                          {new Date(item.scheduled_at).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-indigo-600 shrink-0">
                        {item.mode === 'Online' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-400 font-semibold block text-[11px]">
                          Mode: <strong>{item.mode}</strong>
                        </span>
                        {item.mode === 'Online' && item.venue_or_link.startsWith('http') ? (
                          <a
                            href={item.venue_or_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            Join Online Meeting
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-800 font-medium block mt-0.5 break-all">
                            {item.venue_or_link}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Candidate Instructions */}
                  {item.instructions && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 mb-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-950 mb-0.5">Interview Preparation Instructions:</strong>
                          <span className="leading-relaxed">{item.instructions}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback / Outcome Notes if present */}
                  {item.outcome_notes && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <strong className="block text-slate-900 mb-0.5">Evaluation Feedback:</strong>
                      <span className="leading-relaxed">{item.outcome_notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; Student Interview Cell
      </footer>
    </div>
  );
}
