import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import {
  GraduationCap,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Download,
  Plus,
  Trash2,
  BookOpen,
  Code2,
  FolderGit2,
  Globe,
  Loader2,
  Sparkles,
  Star,
  Check
} from 'lucide-react';

export default function StudentProfile() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [activeTab, setActiveTab] = useState('academic'); // 'academic', 'skills', 'projects', 'resume'
  const [message, setMessage] = useState({ type: '', text: '' });
  const [availableCourses, setAvailableCourses] = useState([]);

  // Multi-Resume Form State
  const [selectedResumeFile, setSelectedResumeFile] = useState(null);
  const [newResumeTitle, setNewResumeTitle] = useState('');
  const [newResumeIsPrimary, setNewResumeIsPrimary] = useState(false);

  // Form State
  const [profile, setProfile] = useState({
    roll_number: '',
    phone: '',
    department: 'CSE',
    branch: 'Computer Science & Engineering',
    graduation_year: 2026,
    tenth_percentage: 0,
    twelfth_percentage: 0,
    cgpa: 0,
    active_backlogs: 0,
    history_of_backlogs: 0,
    skills: [],
    projects: [],
    github_url: '',
    linkedin_url: '',
    resume_filename: null,
    has_resume: false,
    resumes: [],
    completion_percentage: 0,
  });

  // Temporary inputs for skills and projects
  const [skillInput, setSkillInput] = useState('');
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    tech_stack: '',
    github_link: '',
  });

  // AI Resume Analysis State
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

  const handleAnalyzeResume = async () => {
    setAnalyzingResume(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiClient.post('/ai/resume/analyze');
      setAiAnalysisResult(res.data);
      setMessage({
        type: 'success',
        text: 'AI Resume analysis complete! Review extracted skills and recommendations below.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to analyze resume with AI.',
      });
    } finally {
      setAnalyzingResume(false);
    }
  };

  const handleAddSkillFromAi = (skillName) => {
    if (!profile.skills.includes(skillName)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, skillName],
      }));
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/courses');
      setAvailableCourses(res.data.filter((c) => c.is_active));
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/students/profile');
      setProfile(res.data);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load profile.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCourses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]:
        name === 'cgpa' || name === 'tenth_percentage' || name === 'twelfth_percentage'
          ? parseFloat(value) || 0
          : name === 'active_backlogs' || name === 'history_of_backlogs' || name === 'graduation_year'
          ? parseInt(value, 10) || 0
          : value,
    }));
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        phone: profile.phone,
        department: profile.department,
        branch: profile.branch,
        graduation_year: profile.graduation_year,
        tenth_percentage: profile.tenth_percentage,
        twelfth_percentage: profile.twelfth_percentage,
        cgpa: profile.cgpa,
        active_backlogs: profile.active_backlogs,
        history_of_backlogs: profile.history_of_backlogs,
        skills: profile.skills,
        projects: profile.projects,
        github_url: profile.github_url || null,
        linkedin_url: profile.linkedin_url || null,
      };

      const res = await apiClient.put('/students/profile', payload);
      setProfile(res.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Error saving profile. Please check all fields.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!skillInput.trim()) return;
    const trimmed = skillInput.trim();
    if (!profile.skills.includes(trimmed)) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;

    const formattedTech = newProject.tech_stack
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const projectToAdd = {
      title: newProject.title.trim(),
      description: newProject.description.trim(),
      tech_stack: formattedTech,
      github_link: newProject.github_link.trim() || undefined,
    };

    setProfile((prev) => ({
      ...prev,
      projects: [...prev.projects, projectToAdd],
    }));

    setNewProject({ title: '', description: '', tech_stack: '', github_link: '' });
  };

  const handleRemoveProject = (indexToRemove) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleResumeUpload = async (e) => {
    if (e) e.preventDefault();
    if (!selectedResumeFile) {
      setMessage({ type: 'error', text: 'Please select a PDF file to upload.' });
      return;
    }

    if (!selectedResumeFile.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ type: 'error', text: 'Only PDF format (.pdf) is accepted.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedResumeFile);
    if (newResumeTitle.trim()) {
      formData.append('title', newResumeTitle.trim());
    }
    if (newResumeIsPrimary) {
      formData.append('is_primary', 'true');
    }

    setUploadingResume(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiClient.post('/students/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({
        type: 'success',
        text: `Resume "${res.data.title || selectedResumeFile.name}" added to your resume list!`,
      });
      setSelectedResumeFile(null);
      setNewResumeTitle('');
      setNewResumeIsPrimary(false);
      fetchProfile();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to upload resume.',
      });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSetPrimaryResume = async (resumeId, resumeTitle) => {
    try {
      setMessage({ type: '', text: '' });
      await apiClient.put(`/students/resumes/${resumeId}/primary`);
      setMessage({
        type: 'success',
        text: `"${resumeTitle}" is now set as your primary active resume.`,
      });
      fetchProfile();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to set primary resume.',
      });
    }
  };

  const handleDeleteResume = async (resumeId, resumeTitle) => {
    if (!window.confirm(`Are you sure you want to remove "${resumeTitle}" from your resume list?`)) return;
    try {
      setMessage({ type: '', text: '' });
      await apiClient.delete(`/students/resumes/${resumeId}`);
      setMessage({
        type: 'success',
        text: `"${resumeTitle}" removed successfully.`,
      });
      fetchProfile();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to delete resume.',
      });
    }
  };

  const handleDownloadResume = async (resumeId = null, resumeTitle = null) => {
    try {
      const endpoint = resumeId
        ? `/students/resume/download?resume_id=${resumeId}`
        : '/students/resume/download';
      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const downloadName = resumeTitle
        ? `${resumeTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        : `${profile.roll_number || 'student'}_resume.pdf`;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error downloading resume file.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar />

      {/* Sub-Header Action Bar */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/student/dashboard"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <span className="font-bold text-sm text-slate-900 tracking-tight block">
                Academic & Professional Profile
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {profile.full_name} ({profile.roll_number || 'Roll not set'})
              </span>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Profile Completion Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{profile.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {profile.department} &bull; {profile.graduation_year}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                College Email: <span className="font-mono">{profile.email}</span> &bull; Roll:{' '}
                <span className="font-mono">{profile.roll_number || 'N/A'}</span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600 block">
                Profile Completeness: {profile.completion_percentage}%
              </span>
              <div className="w-48 bg-slate-100 rounded-full h-2.5 mt-1.5 overflow-hidden border border-slate-200">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${profile.completion_percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('academic')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'academic'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Academic Records
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'skills'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="h-4 w-4" /> Skills & Contact
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'projects'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderGit2 className="h-4 w-4" /> Projects & Portfolio
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'resume'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" /> Resume PDF
          </button>
        </div>

        {/* Tab 1: Academic Records */}
        {activeTab === 'academic' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Eligibility Metrics</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These scores are verified server-side against company eligibility requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* CGPA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current CGPA (0.0 - 10.0) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  name="cgpa"
                  value={profile.cgpa}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Class 10 Percentage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Class 10 Percentage (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  name="tenth_percentage"
                  value={profile.tenth_percentage}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Class 12 / Diploma Percentage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Class 12 / Diploma (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  name="twelfth_percentage"
                  value={profile.twelfth_percentage}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Active Backlogs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Active Backlogs (Current) *
                </label>
                <input
                  type="number"
                  min="0"
                  name="active_backlogs"
                  value={profile.active_backlogs}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Enter 0 if no active backlogs.</span>
              </div>

              {/* History of Backlogs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Historical Backlogs (Total)
                </label>
                <input
                  type="number"
                  min="0"
                  name="history_of_backlogs"
                  value={profile.history_of_backlogs}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Cleared past backlogs if any.</span>
              </div>

              {/* Passing Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Passing Graduation Year *
                </label>
                <select
                  name="graduation_year"
                  value={profile.graduation_year}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              {/* Department & Branch */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Academic Department & Degree Branch *
                </label>
                <select
                  name="department"
                  value={profile.department}
                  onChange={(e) => {
                    const selCode = e.target.value;
                    const found = availableCourses.find((c) => c.code === selCode);
                    setProfile((prev) => ({
                      ...prev,
                      department: selCode,
                      branch: found ? found.name : prev.branch,
                    }));
                  }}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  {availableCourses.length > 0 ? (
                    availableCourses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="CSE">CSE — Computer Science & Engineering</option>
                      <option value="IT">IT — Information Technology</option>
                      <option value="ECE">ECE — Electronics & Communication</option>
                      <option value="EEE">EEE — Electrical & Electronics</option>
                      <option value="MECH">MECH — Mechanical Engineering</option>
                      <option value="CIVIL">CIVIL — Civil Engineering</option>
                      <option value="AI_DS">AI_DS — Artificial Intelligence & Data Science</option>
                    </>
                  )}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Eligible drives are filtered automatically based on this enrolled branch.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Skills & Contact */}
        {activeTab === 'skills' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Technical Skills & Online Profiles</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Skills are evaluated during AI job matching to discover skill gaps and recommendations.
              </p>
            </div>

            {/* Skills Tag Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Technical Skills (Add skill and press Enter)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Python, React, MongoDB, Docker"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(e);
                    }
                  }}
                  className="block flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {/* Skills Tags List */}
              <div className="flex flex-wrap gap-2 mt-3 min-h-[40px] p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                {profile.skills.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No skills added yet.</span>
                ) : (
                  profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 hover:text-rose-600 ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Links and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  name="github_url"
                  value={profile.github_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://github.com/username"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={profile.linkedin_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/username"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Projects */}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Projects & Internships</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Highlight your engineering projects for recruiter review.
              </p>
            </div>

            {/* Add Project Form */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Add New Project</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Project Title (e.g. AI Placement Portal)"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Tech Stack (comma-separated, e.g. React, FastAPI)"
                  value={newProject.tech_stack}
                  onChange={(e) => setNewProject({ ...newProject, tech_stack: e.target.value })}
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <textarea
                rows={2}
                placeholder="Brief project description and responsibilities..."
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input
                  type="url"
                  placeholder="GitHub Repository URL (Optional)"
                  value={newProject.github_link}
                  onChange={(e) => setNewProject({ ...newProject, github_link: e.target.value })}
                  className="block flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Save Project
                </button>
              </div>
            </div>

            {/* Projects List */}
            <div className="space-y-3 pt-2">
              {profile.projects.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No projects added yet.</p>
              ) : (
                profile.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-4"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{proj.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{proj.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {proj.tech_stack?.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Resume Portfolio */}
        {activeTab === 'resume' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Resume Portfolio & Multiple Versions</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Maintain multiple tailored resumes for different roles (e.g. Frontend, Backend, Data Science). Choose your default primary resume or select one when applying.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {profile.resumes?.length || 0} Resumes on File
                </span>
              </div>
            </div>

            {/* List of Uploaded Resumes */}
            <div className="space-y-3">
              {(!profile.resumes || profile.resumes.length === 0) ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <span>No resume uploaded yet. Add your first resume using the form below to unlock AI job matching and applications.</span>
                </div>
              ) : (
                profile.resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      resume.is_primary
                        ? 'bg-emerald-50/50 border-emerald-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 ${
                        resume.is_primary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-sm text-slate-900 font-bold">{resume.title}</strong>
                          {resume.is_primary && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                              Primary Resume
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                          <span>{resume.original_name}</span>
                          <span>&bull;</span>
                          <span>Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</span>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-sans font-semibold">
                            {resume.extracted_characters} characters parsed
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!resume.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryResume(resume.id, resume.title)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
                          title="Set as default primary resume for campus drives"
                        >
                          <Star className="h-3 w-3 text-amber-500" />
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownloadResume(resume.id, resume.title)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="Download resume PDF"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteResume(resume.id, resume.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete this resume"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Resume Form */}
            <form onSubmit={handleResumeUpload} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Upload & Add New Resume
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resume Title / Focus Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend React Specialist, Data Science Resume"
                    value={newResumeTitle}
                    onChange={(e) => setNewResumeTitle(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select PDF Document (Max 5MB)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedResumeFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={newResumeIsPrimary}
                    onChange={(e) => setNewResumeIsPrimary(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>Mark as my primary default resume</span>
                </label>

                <button
                  type="submit"
                  disabled={uploadingResume || !selectedResumeFile}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {uploadingResume ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {uploadingResume ? 'Processing & Parsing...' : 'Upload to Portfolio'}
                </button>
              </div>
            </form>

            {/* AI Advisory Analysis Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border border-indigo-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">AI Resume Assistant & Skill Extractor</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Extract technical competencies, receive profile improvement tips, and discover missing skills.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeResume}
                  disabled={analyzingResume || (!profile.has_resume && profile.skills.length === 0)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                >
                  {analyzingResume ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {analyzingResume ? 'Analyzing Resume...' : 'Analyze with AI'}
                </button>
              </div>

              {/* AI Results */}
              {aiAnalysisResult && (
                <div className="pt-4 border-t border-indigo-100 space-y-4 animate-in fade-in duration-200">
                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-white border border-indigo-100 text-xs">
                    <span className="font-bold text-slate-900 block mb-1">Professional Profile Summary</span>
                    <p className="text-slate-600 leading-relaxed">{aiAnalysisResult.summary}</p>
                  </div>

                  {/* Identified Skills */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      Identified Skills in Resume ({aiAnalysisResult.identified_skills?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysisResult.identified_skills?.map((s, idx) => {
                        const alreadyAdded = profile.skills.includes(s);
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              alreadyAdded
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-white text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {s}
                            {!alreadyAdded && (
                              <button
                                type="button"
                                onClick={() => handleAddSkillFromAi(s)}
                                className="text-indigo-500 hover:text-indigo-800 ml-1 text-xs font-bold"
                                title="Add to your skills"
                              >
                                + Add
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Suggested Skills to Learn */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      Recommended Complementary Skills
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysisResult.suggested_skills?.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddSkillFromAi(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                          title="Click to add to your profile skills"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Improvement Tips */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-900 block">Placement Readiness Recommendations:</span>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      {aiAnalysisResult.improvement_tips?.map((tip, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Institutional Disclaimer */}
                  <p className="text-[11px] text-slate-400 italic">
                    {aiAnalysisResult.disclaimer}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; Academic Profile Management
      </footer>
    </div>
  );
}
