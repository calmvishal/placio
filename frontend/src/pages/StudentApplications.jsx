import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import {
  GraduationCap,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Briefcase,
  History,
  XCircle,
  Loader2,
  Award,
  ChevronRight
} from 'lucide-react';
import Navbar from '../components/Navbar';

const STAGE_ORDER = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Assessment',
  'Interview Scheduled',
  'Selected',
];

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppForHistory, setSelectedAppForHistory] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/applications/my');
      setApplications(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load applications.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (appId) => {
    if (!window.confirm('Are you sure you want to withdraw your application for this drive?')) return;
    try {
      await apiClient.post(`/applications/${appId}/withdraw`);
      setMessage({ type: 'success', text: 'Application withdrawn successfully.' });
      fetchApplications();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to withdraw application.',
      });
    }
  };

  const getStatusColor = (status) => {
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
      case 'Withdrawn':
        return 'bg-slate-100 text-slate-600 border-slate-200';
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
        {/* Workspace Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Application Tracking
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {applications.length} Submissions
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              My Placement Applications
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Track recruitment stage progression, inspect status audit history, and review your frozen academic snapshot.
            </p>
          </div>

          <Link
            to="/student/jobs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
          >
            <Briefcase className="h-3.5 w-3.5" />
            Explore More Drives
          </Link>
        </div>
        {/* Status Alert */}
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Application Pipeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track recruitment progress, status updates, and stage transition notes from the placement office.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {applications.length} Submissions
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
              Loading your applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <FileCheck2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No applications submitted yet.</p>
              <p className="text-slate-400 mt-1">Explore eligible drives in the catalog and submit your first application.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.map((app) => (
                <div key={app.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base text-slate-900">{app.company_name}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700">{app.job_title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>
                          <strong>CTC:</strong> {app.salary_package}
                        </span>
                        <span>&bull;</span>
                        <span>
                          <strong>Applied:</strong> {new Date(app.applied_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAppForHistory(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <History className="h-3.5 w-3.5 text-indigo-600" />
                        Status History
                      </button>

                      {['Applied', 'Under Review'].includes(app.status) && (
                        <button
                          onClick={() => handleWithdraw(app.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scheduled Interview Date & Details Callout */}
                  {(app.status === 'Interview Scheduled' || app.interview_details) && (
                    <div className="mt-3 p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0 mt-0.5">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-900">
                              {app.interview_details?.round_name || 'Interview Round Scheduled'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-200/70 text-purple-800">
                              {app.interview_details?.mode || 'Scheduled'}
                            </span>
                          </div>
                          <p className="text-xs text-purple-700 font-medium mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {app.interview_details?.scheduled_at ? (
                              <span>
                                <strong>Date & Time:</strong>{' '}
                                {new Date(app.interview_details.scheduled_at).toLocaleString([], {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            ) : (
                              <span>Interview date confirmed &bull; View full instructions in Interviews tab</span>
                            )}
                          </p>
                          {app.interview_details?.venue_or_link && (
                            <p className="text-[11px] text-purple-600 mt-1">
                              <strong>Venue / Link:</strong>{' '}
                              <a
                                href={app.interview_details.venue_or_link}
                                target="_blank"
                                rel="noreferrer"
                                className="underline font-mono text-purple-800 hover:text-purple-950"
                              >
                                {app.interview_details.venue_or_link}
                              </a>
                            </p>
                          )}
                          {app.interview_details?.instructions && (
                            <p className="text-[11px] text-purple-600/90 mt-0.5 italic">
                              Note: {app.interview_details.instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        to="/student/interviews"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs"
                      >
                        View Interviews
                      </Link>
                    </div>
                  )}

                  {/* Visual Stage Progression Pill Bar */}
                  {app.status !== 'Rejected' && app.status !== 'Withdrawn' && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1.5 overflow-x-auto">
                        {STAGE_ORDER.map((stage, idx) => {
                          const currentIdx = STAGE_ORDER.indexOf(app.status);
                          const isPassed = currentIdx >= idx;
                          const isCurrent = app.status === stage;

                          return (
                            <div
                              key={stage}
                              className={`flex items-center gap-1 shrink-0 ${
                                isCurrent
                                  ? 'text-indigo-600 font-bold'
                                  : isPassed
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              <span>{stage}</span>
                              {idx < STAGE_ORDER.length - 1 && (
                                <ChevronRight className="h-3 w-3 text-slate-300" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              ((STAGE_ORDER.indexOf(app.status) + 1) / STAGE_ORDER.length) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Modal */}
        {selectedAppForHistory && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {selectedAppForHistory.company_name}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Application Stage Timeline</h3>
                </div>
                <button
                  onClick={() => setSelectedAppForHistory(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* Snapshot Highlight */}
              <div className="py-4 border-b border-slate-100 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-1">Frozen Application-Time Profile Snapshot</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>CGPA: <strong>{selectedAppForHistory.student_snapshot?.cgpa?.toFixed(2)}</strong></span>
                  <span>Batch: <strong>{selectedAppForHistory.student_snapshot?.graduation_year}</strong></span>
                  <span>Branch: <strong>{selectedAppForHistory.student_snapshot?.department}</strong></span>
                  <span>Backlogs: <strong>{selectedAppForHistory.student_snapshot?.active_backlogs}</strong></span>
                </div>
              </div>

              {/* Status History Timeline */}
              <div className="py-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Transition Audit Trail
                </h4>

                <div className="space-y-3">
                  {selectedAppForHistory.status_history?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
                      <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-slate-900">{item.status}</strong>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.updated_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 leading-relaxed">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-right">
                <button
                  onClick={() => setSelectedAppForHistory(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; Application Pipeline
      </footer>
    </div>
  );
}
