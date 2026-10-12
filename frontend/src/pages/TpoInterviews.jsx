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
  Users,
  Building2,
  Loader2,
  Edit,
  Trash2,
  ExternalLink,
  PlusCircle,
  Save,
  Bell
} from 'lucide-react';

const OUTCOMES = ['Pending', 'Cleared', 'Not Cleared', 'Absent', 'Rescheduled'];

export default function TpoInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [remindingId, setRemindingId] = useState(null);
  const [remindingAll, setRemindingAll] = useState(false);

  // Modal State for Recording Outcome
  const [evaluatingInterview, setEvaluatingInterview] = useState(null);
  const [newOutcome, setNewOutcome] = useState('Cleared');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [updateAppStatus, setUpdateAppStatus] = useState('Selected');
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const params = {};
      if (outcomeFilter) params.outcome = outcomeFilter;
      const res = await apiClient.get('/interviews/all', { params });
      setInterviews(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load interviews.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [outcomeFilter]);

  const handleUpdateOutcome = async (e) => {
    e.preventDefault();
    if (!evaluatingInterview) return;

    setSubmittingOutcome(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.put(`/interviews/${evaluatingInterview.id}/outcome`, {
        outcome: newOutcome,
        outcome_notes: outcomeNotes,
        update_application_status: updateAppStatus || undefined,
      });

      setMessage({
        type: 'success',
        text: `Interview outcome recorded as '${newOutcome}'! Candidate notification dispatched.`,
      });
      setEvaluatingInterview(null);
      setOutcomeNotes('');
      fetchInterviews();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update interview outcome.',
      });
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const handleDeleteInterview = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this interview schedule?')) return;
    try {
      await apiClient.delete(`/interviews/${id}`);
      setMessage({ type: 'success', text: 'Interview schedule canceled and candidate notified.' });
      fetchInterviews();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete interview schedule.' });
    }
  };

  const handleRemindSingle = async (interviewId, studentName) => {
    try {
      setRemindingId(interviewId);
      setMessage({ type: '', text: '' });
      const res = await apiClient.post(`/interviews/${interviewId}/remind`);
      setMessage({
        type: 'success',
        text: res.data?.message || `Interview reminder dispatched to ${studentName}!`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to dispatch interview reminder.',
      });
    } finally {
      setRemindingId(null);
    }
  };

  const handleRemindAll = async () => {
    const pendingCount = interviews.filter((i) => i.outcome === 'Pending').length;
    if (pendingCount === 0) {
      setMessage({ type: 'error', text: 'No pending scheduled interviews found to remind.' });
      return;
    }

    if (!window.confirm(`Send interview reminder notification & email to all ${pendingCount} pending candidates?`)) {
      return;
    }

    try {
      setRemindingAll(true);
      setMessage({ type: '', text: '' });
      const res = await apiClient.post('/interviews/remind-all');
      setMessage({
        type: 'success',
        text: res.data?.message || `Dispatched reminders to ${res.data?.count || pendingCount} candidates!`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to dispatch bulk interview reminders.',
      });
    } finally {
      setRemindingAll(false);
    }
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'Cleared':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Cleared
          </span>
        );
      case 'Not Cleared':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Not Cleared
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Absent
          </span>
        );
      case 'Rescheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Rescheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Pending Evaluation
          </span>
        );
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
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Scheduled Interview Sessions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track candidate timings, video links, venue assignments, and record round outcomes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={remindingAll || interviews.filter((i) => i.outcome === 'Pending').length === 0}
              onClick={handleRemindAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50 shadow-sm"
              title="Send reminder notifications & emails to all pending scheduled candidates"
            >
              {remindingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />
              ) : (
                <Bell className="h-3.5 w-3.5 text-amber-700" />
              )}
              Remind All Pending ({interviews.filter((i) => i.outcome === 'Pending').length})
            </button>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Filter Outcome:</label>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
              >
                <option value="">All Outcomes</option>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Interviews Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Active Schedules</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {interviews.length} Total Sessions
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
              Loading interview schedules...
            </div>
          ) : interviews.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No interviews match current filters.</p>
              <p className="text-slate-400 mt-1">
                You can schedule interviews directly from the Applicant Review table.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Candidate & Roll</th>
                    <th className="py-3 px-4">Company & Drive</th>
                    <th className="py-3 px-4">Round Name</th>
                    <th className="py-3 px-4">Scheduled Date & Time</th>
                    <th className="py-3 px-4">Mode & Venue</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {interviews.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block">{item.student_name}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.student_roll} &bull; {item.student_department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block">{item.company_name}</strong>
                        <span className="text-[11px] text-slate-500">{item.job_title}</span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-indigo-700">{item.round_name}</td>

                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block">
                          {new Date(item.scheduled_at).toLocaleDateString()}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {new Date(item.scheduled_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <span className="font-semibold block">{item.mode}</span>
                        {item.mode === 'Online' && item.venue_or_link.startsWith('http') ? (
                          <a
                            href={item.venue_or_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 underline truncate max-w-[180px]"
                          >
                            Meeting Link <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-500 truncate block">
                            {item.venue_or_link}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">{getOutcomeBadge(item.outcome)}</td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {item.outcome === 'Pending' && (
                            <button
                              type="button"
                              disabled={remindingId === item.id}
                              onClick={() => handleRemindSingle(item.id, item.student_name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50 shadow-sm"
                              title="Send interview reminder email & notification to candidate"
                            >
                              {remindingId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-amber-700" />
                              ) : (
                                <Bell className="h-3 w-3 text-amber-700" />
                              )}
                              Remind
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEvaluatingInterview(item);
                              setNewOutcome(item.outcome !== 'Pending' ? item.outcome : 'Cleared');
                              setOutcomeNotes(item.outcome_notes || '');
                              setUpdateAppStatus(item.outcome === 'Cleared' ? 'Selected' : 'Shortlisted');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            <Edit className="h-3 w-3" />
                            Record Outcome
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInterview(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Cancel / Delete schedule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Modal: Record Outcome */}
        {evaluatingInterview && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-xl">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Record Interview Outcome
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {evaluatingInterview.student_name} — {evaluatingInterview.round_name}
                  </h3>
                </div>
                <button
                  onClick={() => setEvaluatingInterview(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleUpdateOutcome} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Interview Round Outcome *
                  </label>
                  <select
                    value={newOutcome}
                    onChange={(e) => {
                      setNewOutcome(e.target.value);
                      if (e.target.value === 'Cleared') setUpdateAppStatus('Selected');
                      else if (e.target.value === 'Not Cleared') setUpdateAppStatus('Rejected');
                    }}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {OUTCOMES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Advance Application Pipeline Stage
                  </label>
                  <select
                    value={updateAppStatus}
                    onChange={(e) => setUpdateAppStatus(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Leave Stage Unchanged</option>
                    <option value="Selected">Selected</option>
                    <option value="Shortlisted">Shortlisted (for Next Round)</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Evaluator Feedback & Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Cleared technical DSA problem solving round with flying colors."
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Candidate will receive this feedback in their in-app notifications and interview feed.
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEvaluatingInterview(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOutcome}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {submittingOutcome ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Outcome
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; TPO Interview Management
      </footer>
    </div>
  );
}
