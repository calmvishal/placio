import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Server,
  HelpCircle,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';

export default function EmailConfigModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications/email-config');
      setConfig(res.data);
    } catch (err) {
      console.error('Failed to load email config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail) return;

    setSendingTest(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiClient.post('/notifications/test-email', {
        recipient_email: testEmail.trim(),
      });
      setMessage({
        type: 'success',
        text: `Test email dispatched! Result: ${res.data.result?.status || 'dispatched'}. Check inbox or server logs.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to dispatch test email.',
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Email Notification System</h3>
              <p className="text-xs text-slate-500 font-medium">Automatic Student Status & Interview Alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Status Alert */}
        {message.text && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
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

        {/* Content */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
            Checking email service configuration...
          </div>
        ) : (
          <div className="space-y-5 pt-4">
            {/* Service Status Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-indigo-600" />
                  Service Dispatch Mode
                </span>
                {config?.mode === 'live_smtp' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Live SMTP Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Mock Demo Mode
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Host & Port:</span>
                  <span className="font-mono text-slate-800">{config?.smtp_host}:{config?.smtp_port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sender Identity:</span>
                  <span className="text-slate-800">{config?.smtp_from_name} ({config?.smtp_from_email})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SMTP Auth User:</span>
                  <span className="font-mono text-slate-800">{config?.smtp_user || '(None / Mock delivery)'}</span>
                </div>
              </div>
            </div>

            {/* Test Email Form */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-xs font-bold text-indigo-900 block mb-1">
                Dispatch Test Notification
              </span>
              <p className="text-[11px] text-indigo-700/80 mb-3 leading-relaxed">
                Send a sample recruitment alert email to verify outbound message delivery.
              </p>

              <form onSubmit={handleSendTestEmail} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="e.g. your_email@college.edu"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send Test
                </button>
              </form>
            </div>

            {/* How to configure live SMTP Instructions */}
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                How to Enable Live Gmail / College SMTP:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                <li>
                  Open your Google Account &rarr; <strong>Security</strong> &rarr; <strong>2-Step Verification</strong>.
                </li>
                <li>
                  Search for <strong>App Passwords</strong> and generate a 16-character app password (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">xxxx xxxx xxxx xxxx</code>).
                </li>
                <li>
                  Open <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">backend/.env</code> and configure:
                  <div className="mt-1.5 p-2 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[10px] leading-relaxed select-all">
                    SMTP_ENABLED=true<br/>
                    SMTP_HOST=smtp.gmail.com<br/>
                    SMTP_PORT=587<br/>
                    SMTP_USER=your_email@gmail.com<br/>
                    SMTP_PASSWORD=your_app_password<br/>
                    SMTP_FROM_EMAIL=your_email@gmail.com
                  </div>
                </li>
                <li>Restart the FastAPI backend and test delivery above.</li>
              </ol>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
