import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import {
  GraduationCap,
  Plus,
  Trash2,
  X,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function CourseManagerModal({ isOpen, onClose, onCoursesUpdated }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/courses');
      setCourses(res.data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiClient.post('/courses', {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim()
      });

      setMessage({ type: 'success', text: `Course '${res.data.code}' added successfully!` });
      setCode('');
      setName('');
      setDescription('');
      fetchCourses();
      if (onCoursesUpdated) onCoursesUpdated();
    } catch (err) {
      const errDetail = err.response?.data?.detail || 'Failed to add course.';
      setMessage({ type: 'error', text: errDetail });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseCode) => {
    if (!window.confirm(`Are you sure you want to deactivate course '${courseCode}'?`)) return;

    try {
      await apiClient.delete(`/courses/${courseCode}`);
      setMessage({ type: 'success', text: `Course '${courseCode}' deactivated.` });
      fetchCourses();
      if (onCoursesUpdated) onCoursesUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deactivating course.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Manage Courses & Departments</h3>
              <p className="text-[11px] text-slate-300">Add or configure eligible engineering branches & degree programs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {message.text && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Add New Course Form */}
          <form onSubmit={handleAddCourse} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-indigo-600" />
              Add New Course / Branch
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Code (e.g. AERO, CSBS)
                </label>
                <input
                  type="text"
                  required
                  placeholder="AERO"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Full Department / Degree Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Aeronautical Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Brief Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Aerospace systems, propulsion, and aerodynamics"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="text-right">
              <button
                type="submit"
                disabled={submitting || !code.trim() || !name.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Course
              </button>
            </div>
          </form>

          {/* Existing Courses List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                Active Academic Programs ({courses.length})
              </h4>
              <span className="text-[11px] text-slate-400">Available across drives & student profiles</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No courses registered.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                {courses.map((course) => (
                  <div
                    key={course.id || course.code}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                        {course.code}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900 block">{course.name}</span>
                        {course.description && (
                          <span className="text-slate-500 text-[11px]">{course.description}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCourse(course.code)}
                      title="Deactivate course"
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
