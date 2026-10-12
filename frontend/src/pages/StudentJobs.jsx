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
  XCircle,
  AlertCircle,
  Clock,
  Briefcase,
  HelpCircle,
  Sparkles,
  Loader2,
  Send,
  FileCheck,
  Award,
  Lightbulb,
  Search,
  X,
  Filter,
  FileText,
  Upload,
  Star,
  Plus
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import Navbar from '../components/Navbar';

export default function StudentJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobForModal, setSelectedJobForModal] = useState(null);
  const [aiModalJob, setAiModalJob] = useState(null);
  const [aiMatchData, setAiMatchData] = useState(null);
  const [loadingAiMatch, setLoadingAiMatch] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('all'); // 'all', 'eligible', 'ineligible'

  // Pre-Application AI Review & Resume Selection Modal
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [studentResumes, setStudentResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [preApplyAiFit, setPreApplyAiFit] = useState(null);
  const [loadingPreApplyAiFit, setLoadingPreApplyAiFit] = useState(false);

  // Quick inline resume upload inside the pre-apply modal
  const [showInlineUpload, setShowInlineUpload] = useState(false);
  const [inlineFile, setInlineFile] = useState(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [uploadingInline, setUploadingInline] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOpenPreApply = async (job) => {
    setApplyModalJob(job);
    setSelectedJobForModal(null);
    setShowInlineUpload(false);
    setInlineFile(null);
    setInlineTitle('');
    setPreApplyAiFit(null);
    setLoadingResumes(true);

    try {
      const res = await apiClient.get('/students/resumes');
      const resumesList = res.data || [];
      setStudentResumes(resumesList);

      const primaryRes = resumesList.find((r) => r.is_primary) || resumesList[0];
      const initialResumeId = primaryRes ? primaryRes.id : '';
      setSelectedResumeId(initialResumeId);

      if (initialResumeId) {
        evaluatePreApplyAi(job.id, initialResumeId);
      } else {
        evaluatePreApplyAi(job.id, null);
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  const evaluatePreApplyAi = async (jobId, resumeId) => {
    setLoadingPreApplyAiFit(true);
    setPreApplyAiFit(null);
    try {
      const params = {};
      if (resumeId) params.resume_id = resumeId;
      const res = await apiClient.get(`/ai/job-match/${jobId}`, { params });
      setPreApplyAiFit(res.data);
    } catch (err) {
      console.error('Failed to get AI match data:', err);
    } finally {
      setLoadingPreApplyAiFit(false);
    }
  };

  const handleResumeSelectionChange = (newResumeId) => {
    setSelectedResumeId(newResumeId);
    if (applyModalJob) {
      evaluatePreApplyAi(applyModalJob.id, newResumeId);
    }
  };

  const handleInlineResumeUpload = async (e) => {
    e.preventDefault();
    if (!inlineFile) return;

    setUploadingInline(true);
    try {
      const formData = new FormData();
      formData.append('file', inlineFile);
      if (inlineTitle.trim()) {
        formData.append('title', inlineTitle.trim());
      }
      formData.append('is_primary', 'false');

      const res = await apiClient.post('/students/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const listRes = await apiClient.get('/students/resumes');
      const updatedList = listRes.data || [];
      setStudentResumes(updatedList);
      const newResumeId = res.data.resume_id;
      setSelectedResumeId(newResumeId);
      setShowInlineUpload(false);
      setInlineFile(null);
      setInlineTitle('');

      if (applyModalJob) {
        evaluatePreApplyAi(applyModalJob.id, newResumeId);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload resume.');
    } finally {
      setUploadingInline(false);
    }
  };

  const handleFinalSubmitApplication = async () => {
    if (!applyModalJob) return;

    setApplyingId(applyModalJob.id);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        job_id: applyModalJob.id,
      };
      if (selectedResumeId) {
        payload.resume_id = selectedResumeId;
      }

      await apiClient.post('/applications', payload);
      setMessage({
        type: 'success',
        text: `Application submitted successfully for ${applyModalJob.company_name}! Your selected resume and academic snapshot are frozen for this drive.`,
      });
      setApplyModalJob(null);
      fetchJobs();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to submit application.',
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleOpenAiMatch = async (job) => {
    setAiModalJob(job);
    setAiMatchData(null);
    setLoadingAiMatch(true);
    try {
      const res = await apiClient.get(`/ai/job-match/${job.id}`);
      setAiMatchData(res.data);
    } catch (err) {
      console.error('Failed to get AI match data:', err);
    } finally {
      setLoadingAiMatch(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    // 1. Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const comp = (job.company_name || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      const loc = (job.location || '').toLowerCase();
      const skills = (job.required_skills || []).join(' ').toLowerCase();
      const branches = (job.required_branches || []).join(' ').toLowerCase();
      const jobType = (job.job_type || '').toLowerCase();

      const matches =
        comp.includes(q) ||
        title.includes(q) ||
        loc.includes(q) ||
        skills.includes(q) ||
        branches.includes(q) ||
        jobType.includes(q);

      if (!matches) return false;
    }

    // 2. Eligibility filter
    if (eligibilityFilter === 'eligible') {
      if (!job.can_apply && !job.already_applied) return false;
    } else if (eligibilityFilter === 'ineligible') {
      if (job.can_apply || job.already_applied) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
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

        {/* Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h1 className="text-base font-bold text-slate-900">
                  Transparent Eligibility Verification
                </h1>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Eligibility is strictly evaluated server-side against company criteria (CGPA, Branch, Backlogs, Passing Batch). Click any opportunity to inspect why you are eligible or ineligible.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0">
              {jobs.length} Active Opportunities
            </span>
          </div>
        </div>

        {/* Search & Quick Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by company, role, skills, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Filter:</span>
            <button
              type="button"
              onClick={() => setEligibilityFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                eligibilityFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Drives ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setEligibilityFilter('eligible')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                eligibilityFilter === 'eligible'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Eligible ({jobs.filter((j) => j.can_apply || j.already_applied).length})
            </button>
            <button
              type="button"
              onClick={() => setEligibilityFilter('ineligible')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                eligibilityFilter === 'ineligible'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ineligible ({jobs.filter((j) => !j.can_apply && !j.already_applied).length})
            </button>
          </div>
        </div>

        {/* Opportunities List */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
            Evaluating eligibility for active opportunities...
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No placement drives currently open.</p>
            <p className="text-slate-400 mt-1">Check back soon or update your academic profile in the meantime.</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No placement drives match your search.</p>
            <p className="text-slate-400 mt-1">Try different search terms or reset your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setEligibilityFilter('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              Clear Search & Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        {job.company_name}
                      </span>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">{job.title}</h2>
                    </div>

                    {/* Eligibility Badge */}
                    <div>
                      {job.deadline_passed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <Clock className="h-3 w-3" /> Expired
                        </span>
                      ) : job.already_applied ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <CheckCircle2 className="h-3 w-3" /> Applied
                        </span>
                      ) : job.is_eligible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3" /> Ineligible
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mt-2">{job.description}</p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">CTC Package:</span>
                      <strong className="text-slate-800">{job.salary_package}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Location & Mode:</span>
                      <span className="text-slate-800">
                        {job.location} ({job.work_mode})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Min CGPA Requirement:</span>
                      <span className="text-slate-800">{job.min_cgpa.toFixed(1)} / 10.0</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Eligible Batches:</span>
                      <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                        {job.eligible_batches && job.eligible_batches.length > 0
                          ? job.eligible_batches.join(', ')
                          : job.graduation_year}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Deadline:</span>
                      <span className="text-slate-800">
                        {new Date(job.application_deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAiMatch(job)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors"
                      title="Advisory AI Fit & Skill Gap Analysis"
                    >
                      <Sparkles className="h-3 w-3 text-purple-600" />
                      AI Match
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedJobForModal(job)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      Eligibility
                    </button>
                  </div>

                  {job.can_apply ? (
                    <button
                      type="button"
                      disabled={applyingId === job.id}
                      onClick={() => handleOpenPreApply(job)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Apply for Drive
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      {job.already_applied
                        ? 'Application Submitted'
                        : job.deadline_passed
                        ? 'Deadline Closed'
                        : 'Criteria Not Met'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Eligibility Breakdown & Apply */}
        {selectedJobForModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {selectedJobForModal.company_name}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{selectedJobForModal.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedJobForModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* Overall Eligibility Status Banner */}
              <div className="py-4">
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 font-medium ${
                    selectedJobForModal.is_eligible
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {selectedJobForModal.is_eligible ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span>You satisfy all mandatory academic and department requirements!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      <span>You do not meet one or more mandatory eligibility requirements below.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Criteria List */}
              <div className="space-y-3 pb-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Rule-Based Evaluation Details
                </h4>

                {selectedJobForModal.eligibility_criteria?.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                      item.passed
                        ? 'bg-slate-50 border-slate-200/80 text-slate-700'
                        : 'bg-rose-50/50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {item.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-slate-900">{item.rule}</strong>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Req: {item.required_value} | Yours: {item.student_value}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-600">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedJobForModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                {selectedJobForModal.can_apply && (
                  <button
                    type="button"
                    onClick={() => handleOpenPreApply(selectedJobForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Review & Apply
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Advisory AI Match & Skill Gap Analysis */}
        {aiModalJob && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    Advisory AI Job Fit Analysis
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {aiModalJob.company_name} — {aiModalJob.title}
                  </h3>
                </div>
                <button
                  onClick={() => setAiModalJob(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {loadingAiMatch ? (
                <div className="p-16 text-center text-slate-500 text-xs">
                  <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-3" />
                  Evaluating your technical skills against {aiModalJob.company_name} requirements...
                </div>
              ) : aiMatchData ? (
                <div className="space-y-4 pt-4">
                  {/* Match Score Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-purple-900 block">Advisory Skill Match</span>
                      <span className="text-[11px] text-purple-700">
                        Based on skills, resume keywords, and credentials
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-2xl font-black ${
                          aiMatchData.match_score >= 70
                            ? 'text-emerald-600'
                            : aiMatchData.match_score >= 50
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {aiMatchData.match_score}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold">Match Score</span>
                    </div>
                  </div>

                  {/* Matching Skills */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Matching Competencies ({aiMatchData.matching_skills?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiMatchData.matching_skills?.length > 0 ? (
                        aiMatchData.matching_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No exact skill matches identified.</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills / Skill Gaps */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Skill Gap Areas to Learn ({aiMatchData.missing_skills?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiMatchData.missing_skills?.length > 0 ? (
                        aiMatchData.missing_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">
                          No major skill gaps detected! Your profile covers the key requirements.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Personalized Recommendations */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-indigo-600" />
                      Personalized Preparation Roadmap:
                    </span>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      {aiMatchData.recommendations?.map((r, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Showcase Project Ideas */}
                  {aiMatchData.project_ideas?.length > 0 && (
                    <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2 text-xs">
                      <span className="font-bold text-purple-950 block flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-purple-600" />
                        Recommended Showcase Project Topics:
                      </span>
                      <ul className="space-y-1 text-purple-900 list-disc list-inside">
                        {aiMatchData.project_ideas.map((p, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-500 leading-relaxed italic">
                    {aiMatchData.disclaimer}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-rose-500">
                  Unable to load AI job fit analysis. Please ensure your profile skills are up to date.
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 text-right mt-4">
                <button
                  type="button"
                  onClick={() => setAiModalJob(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: AI Pre-Application & Resume Alignment Review */}
        {applyModalJob && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Pre-Application & Resume Review
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {applyModalJob.company_name} — {applyModalJob.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>Package: <strong className="text-slate-800">{applyModalJob.salary_package}</strong></span>
                    <span>&bull;</span>
                    <span>Location: {applyModalJob.location} ({applyModalJob.work_mode})</span>
                  </div>
                </div>
                <button
                  onClick={() => setApplyModalJob(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
                >
                  &times;
                </button>
              </div>

              <div className="py-5 space-y-6">
                {/* 1. Resume Selection Portfolio */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        Select Resume for this Application
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Choose which version from your resume portfolio to submit to {applyModalJob.company_name}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowInlineUpload(!showInlineUpload)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {showInlineUpload ? 'Cancel Upload' : 'Upload Tailored Resume'}
                    </button>
                  </div>

                  {/* Inline Upload Form */}
                  {showInlineUpload && (
                    <form onSubmit={handleInlineResumeUpload} className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-3 space-y-3">
                      <span className="text-xs font-bold text-slate-800 block">Attach Custom Resume for this Drive:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Title (e.g. Tailored React Resume)"
                          value={inlineTitle}
                          onChange={(e) => setInlineTitle(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setInlineFile(e.target.files?.[0] || null)}
                          className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700"
                        />
                      </div>
                      <div className="text-right">
                        <button
                          type="submit"
                          disabled={uploadingInline || !inlineFile}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {uploadingInline ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {uploadingInline ? 'Uploading & Parsing...' : 'Save & Select Resume'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Resume Radio/Card Selection */}
                  {loadingResumes ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading your resume portfolio...
                    </div>
                  ) : studentResumes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">No Resumes Found on File</strong>
                        <span>Please upload a tailored resume above or in your student profile before applying.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {studentResumes.map((r) => {
                        const isSelected = selectedResumeId === r.id;
                        return (
                          <div
                            key={r.id}
                            onClick={() => handleResumeSelectionChange(r.id)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20'
                                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                <strong className="text-slate-900 truncate block">{r.title}</strong>
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono truncate block mt-0.5">
                                {r.original_name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                                {r.is_primary && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                    <Star className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" /> Primary
                                  </span>
                                )}
                                <span>{r.extracted_characters} chars</span>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Live AI Job Fit & Low-Relevance Recommendations */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      AI Job Description vs Resume Fit Analysis
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium italic">
                      Live AI Evaluator
                    </span>
                  </div>

                  {loadingPreApplyAiFit ? (
                    <div className="p-8 rounded-xl bg-purple-50/40 border border-purple-100 text-center text-xs text-purple-900">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                      Evaluating your selected resume keywords against {applyModalJob.company_name} requirements...
                    </div>
                  ) : preApplyAiFit ? (
                    <div className="space-y-4">
                      {/* Match Score Banner */}
                      <div className={`p-4 rounded-xl border flex items-center justify-between ${
                        preApplyAiFit.match_score >= 60
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-amber-50/80 border-amber-200'
                      }`}>
                        <div>
                          <span className={`text-xs font-bold block ${
                            preApplyAiFit.match_score >= 60 ? 'text-emerald-900' : 'text-amber-950'
                          }`}>
                            {preApplyAiFit.match_score >= 60
                              ? 'Strong Resume-to-Job Alignment'
                              : '⚠️ Advisory: Low Keyword & Skill Relevance (< 60%)'}
                          </span>
                          <span className={`text-[11px] block mt-0.5 ${
                            preApplyAiFit.match_score >= 60 ? 'text-emerald-700' : 'text-amber-800'
                          }`}>
                            {preApplyAiFit.match_score >= 60
                              ? 'Your selected resume demonstrates strong alignment with required technical proficiencies.'
                              : 'Your selected resume lacks key technical skills required by this placement opportunity.'}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className={`text-2xl font-black ${
                            preApplyAiFit.match_score >= 70
                              ? 'text-emerald-600'
                              : preApplyAiFit.match_score >= 60
                              ? 'text-teal-600'
                              : 'text-amber-600'
                          }`}>
                            {preApplyAiFit.match_score}%
                          </span>
                          <span className="text-[10px] text-slate-400 block font-semibold">Match Score</span>
                        </div>
                      </div>

                      {/* Matching Skills */}
                      {preApplyAiFit.matching_skills?.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Matching Skills Detected ({preApplyAiFit.matching_skills.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {preApplyAiFit.matching_skills.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Skills */}
                      {preApplyAiFit.missing_skills?.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                            Missing JD Requirements ({preApplyAiFit.missing_skills.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {preApplyAiFit.missing_skills.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Recommendations if Low Relevance */}
                      {preApplyAiFit.match_score < 60 && (
                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
                          <span className="font-bold text-amber-950 block flex items-center gap-1.5">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                            AI Recommended Changes Before Applying:
                          </span>
                          <ul className="space-y-1.5 text-amber-900 list-disc list-inside">
                            {preApplyAiFit.recommendations?.map((rec, idx) => (
                              <li key={idx} className="leading-relaxed">
                                {rec}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 pt-2 border-t border-amber-200/80 text-[11px] text-amber-800 font-medium">
                            💡 You can upload a revised resume with these keywords, select an alternate resume from your portfolio above, or proceed to submit if you are confident.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setApplyModalJob(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={applyingId === applyModalJob.id || (!selectedResumeId && studentResumes.length > 0)}
                  onClick={handleFinalSubmitApplication}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
                >
                  {applyingId === applyModalJob.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {preApplyAiFit?.match_score < 60
                    ? 'Confirm & Submit Application Anyway'
                    : 'Confirm & Submit Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; Student Opportunities Catalog
      </footer>
    </div>
  );
}
