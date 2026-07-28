import React, { useState } from 'react';
import { UserAccount } from '../types';
import { safeFetchJson } from '../utils/api';
import { Mail, User, ShieldCheck, Check, Server, Key, RefreshCw, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface EmailLoginModalProps {
  isOpen: boolean;
  onLogin: (account: UserAccount) => void;
  currentAccount?: UserAccount | null;
  onClose?: () => void;
  defaultEmail?: string;
}

export const EmailLoginModal: React.FC<EmailLoginModalProps> = ({
  isOpen,
  onLogin,
  currentAccount,
  onClose,
  defaultEmail = 'dispatcher.song@gmail.com',
}) => {
  const [provider, setProvider] = useState<'Gmail' | 'Yahoo' | 'Custom'>(() => {
    if (currentAccount?.provider === 'Yahoo Mail' || currentAccount?.email?.includes('@yahoo.')) return 'Yahoo';
    if (currentAccount?.provider === 'Custom') return 'Custom';
    return 'Gmail';
  });

  const [email, setEmail] = useState<string>(currentAccount?.email || defaultEmail);
  const [name, setName] = useState<string>(currentAccount?.name || 'Manager Song (PDF Dispatcher)');
  const [appPassword, setAppPassword] = useState<string>(currentAccount?.appPassword || '');
  const [smtpHost, setSmtpHost] = useState<string>(
    currentAccount?.smtpHost || (provider === 'Yahoo' ? 'smtp.mail.yahoo.com' : 'smtp.gmail.com')
  );
  const [smtpPort, setSmtpPort] = useState<number>(
    currentAccount?.smtpPort || (provider === 'Yahoo' ? 465 : 587)
  );

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSelectProvider = (p: 'Gmail' | 'Yahoo' | 'Custom') => {
    setProvider(p);
    setErrorMsg('');
    setTestStatus(null);
    if (p === 'Gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(587);
      if (email.includes('@yahoo.')) {
        setEmail(email.replace(/@yahoo\.[a-z.]+$/i, '@gmail.com'));
      }
    } else if (p === 'Yahoo') {
      setSmtpHost('smtp.mail.yahoo.com');
      setSmtpPort(465);
      if (email.includes('@gmail.com')) {
        setEmail(email.replace(/@gmail\.com$/i, '@yahoo.com'));
      }
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const lower = val.toLowerCase();
    if (lower.includes('@yahoo.')) {
      if (provider !== 'Yahoo') {
        setProvider('Yahoo');
        setSmtpHost('smtp.mail.yahoo.com');
        setSmtpPort(465);
      }
    } else if (lower.endsWith('@gmail.com')) {
      if (provider !== 'Gmail') {
        setProvider('Gmail');
        setSmtpHost('smtp.gmail.com');
        setSmtpPort(587);
      }
    }
  };

  const handleTestConnection = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid sender email address first.');
      return;
    }
    if (!appPassword) {
      setErrorMsg('Please enter the 16-character App Password first.');
      return;
    }

    setIsTesting(true);
    setTestStatus(null);
    setErrorMsg('');

    try {
      const result = await safeFetchJson('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: smtpHost || (provider === 'Yahoo' ? 'smtp.mail.yahoo.com' : 'smtp.gmail.com'),
          smtpPort: smtpPort || (provider === 'Yahoo' ? 465 : 587),
          secure: smtpPort === 465,
          user: email.trim(),
          pass: appPassword.trim(),
        }),
      });

      if (result.ok && result.data?.success) {
        setTestStatus({
          success: true,
          message: result.data.message || 'SMTP test successful! Ready to dispatch emails.',
        });
      } else {
        const errorDetail = result.error || result.data?.error || 'SMTP authentication failed. Please verify 2-Step Verification and 16-character App Password.';
        setTestStatus({
          success: false,
          message: errorDetail,
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err?.message || 'Could not connect to backend server. Please verify network connection.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address!');
      return;
    }

    const providerLabel = provider === 'Gmail' ? 'Google Gmail' : provider === 'Yahoo' ? 'Yahoo Mail' : 'Custom SMTP';

    const account: UserAccount = {
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      provider: providerLabel,
      isLoggedIn: true,
      loginTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      appPassword: appPassword.trim(),
      smtpHost: smtpHost || (provider === 'Yahoo' ? 'smtp.mail.yahoo.com' : 'smtp.gmail.com'),
      smtpPort: smtpPort || (provider === 'Yahoo' ? 465 : 587),
    };

    setErrorMsg('');
    onLogin(account);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Top Banner */}
        <div className={`p-5 text-white relative transition-colors ${
          provider === 'Yahoo'
            ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-violet-700'
            : provider === 'Gmail'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600'
            : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0 text-xl font-bold">
              {provider === 'Yahoo' ? '🟣' : provider === 'Gmail' ? '🟢' : '🌐'}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-white/90 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {provider === 'Yahoo' ? 'Yahoo Mail Authentication' : provider === 'Gmail' ? 'Google Gmail Authentication' : 'Custom SMTP Authentication'}
              </div>
              <h2 className="text-lg font-extrabold tracking-tight">
                {provider === 'Yahoo' ? 'Login Yahoo Sender Account' : provider === 'Gmail' ? 'Login Google Gmail Sender Account' : 'Configure Custom SMTP Sender Account'}
              </h2>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/90 leading-relaxed">
            Directly connect <strong>Google Gmail</strong> or <strong>Yahoo Mail</strong> accounts. Once saved, send PDF attachments directly to <strong>any target email address</strong>.
          </p>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">

          {/* Provider Choice Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            <button
              type="button"
              onClick={() => handleSelectProvider('Gmail')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                provider === 'Gmail'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Google Gmail</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectProvider('Yahoo')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                provider === 'Yahoo'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
              <span>Yahoo Mail</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectProvider('Custom')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                provider === 'Custom'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5 shrink-0" />
              <span>Custom SMTP</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">

            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {provider === 'Yahoo' ? 'Yahoo Email Address' : provider === 'Gmail' ? 'Gmail Address' : 'Sender Email Address'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder={provider === 'Yahoo' ? 'e.g., yourname@yahoo.com' : provider === 'Gmail' ? 'e.g., yourname@gmail.com' : 'e.g., user@domain.com'}
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 font-medium ${
                    provider === 'Gmail' ? 'focus:ring-emerald-500' : provider === 'Yahoo' ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sender Display Name / Department
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Manager Song (PDF Dispatcher)"
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    provider === 'Gmail' ? 'focus:ring-emerald-500' : provider === 'Yahoo' ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* App Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {provider === 'Yahoo' ? 'Yahoo App Password' : provider === 'Gmail' ? 'Gmail App Password' : 'SMTP App Password'} <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder={
                    provider === 'Yahoo'
                      ? '16-character Yahoo App Password (e.g. abcd efgh ijkl mnop)'
                      : provider === 'Gmail'
                      ? '16-character Google App Password (e.g. abcd efgh ijkl mnop)'
                      : 'Enter SMTP authorization password'
                  }
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    provider === 'Gmail' ? 'focus:ring-emerald-500' : provider === 'Yahoo' ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
                  }`}
                />
              </div>

              {/* Tutorial Card */}
              {provider === 'Yahoo' ? (
                <div className="p-3 mt-2 bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl text-[11px] text-purple-900 dark:text-purple-200 space-y-1 leading-normal">
                  <div className="font-bold flex items-center gap-1 text-purple-800 dark:text-purple-300">
                    <Info className="w-3.5 h-3.5" />
                    How to generate a Yahoo App Password?
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[10.5px]">
                    <li>Sign in to Yahoo and visit <strong>login.yahoo.com</strong> security settings</li>
                    <li>Select <strong>Account Security</strong></li>
                    <li>Click <strong>Generate app password</strong></li>
                    <li>Enter app name <code>PDF Dispatcher</code> and copy the 16-character password above</li>
                  </ol>
                </div>
              ) : provider === 'Gmail' ? (
                <div className="p-3 mt-2 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1 leading-normal">
                  <div className="font-bold flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
                    <Info className="w-3.5 h-3.5" />
                    How to generate a Gmail App Password?
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[10.5px]">
                    <li>Visit Google Account settings (myaccount.google.com)</li>
                    <li>Go to Security ➔ Enable 2-Step Verification</li>
                    <li>Search for "App Passwords"</li>
                    <li>Create an app password for PDF Dispatcher and paste the 16-character key above</li>
                  </ol>
                </div>
              ) : (
                <div className="p-3 mt-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 space-y-1 leading-normal">
                  <div className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                    <Info className="w-3.5 h-3.5" />
                    Custom SMTP Notes
                  </div>
                  <p className="text-[10.5px]">
                    Ensure POP3/SMTP or IMAP/SMTP is enabled on your email provider, then enter your authorization key above.
                  </p>
                </div>
              )}
            </div>

            {/* SMTP Config Bar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> SMTP Server Settings
                </span>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test SMTP Connection'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder={provider === 'Yahoo' ? 'smtp.mail.yahoo.com' : 'smtp.gmail.com'}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder={provider === 'Yahoo' ? '465' : '587'}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {testStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                  testStatus.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800'
                }`}
              >
                {testStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-tight">{testStatus.message}</div>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-medium border border-rose-200 dark:bg-rose-950/50 dark:border-rose-900">
                {errorMsg}
              </div>
            )}

            {/* Submit & Close Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                  provider === 'Yahoo'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20'
                    : provider === 'Gmail'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black shadow-slate-500/20'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Save {provider === 'Yahoo' ? 'Yahoo' : provider === 'Gmail' ? 'Gmail' : 'Sender'} Account</span>
              </button>
            </div>
          </form>

          {/* Footer Security Badge */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              SSL/TLS Encrypted
            </span>
            <span>Send to any destination email</span>
          </div>

        </div>
      </div>
    </div>
  );
};


