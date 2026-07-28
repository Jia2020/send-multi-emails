import React from 'react';
import { UserAccount } from '../types';
import { FileText, Mail, Sparkles, RefreshCw, HelpCircle, LogIn, UserCheck, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  hasDocument: boolean;
  onReset: () => void;
  onLoadSample: () => void;
  onOpenHelp: () => void;
  isProcessing: boolean;
  currentUser: UserAccount | null;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasDocument,
  onReset,
  onLoadSample,
  onOpenHelp,
  isProcessing,
  currentUser,
  onOpenLogin,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <div className="relative">
              <FileText className="w-5 h-5" />
              <Mail className="w-3 h-3 absolute -bottom-1 -right-1 text-blue-200 fill-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
              PDF Splitter & Dispatcher
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-medium">
                Drag & Send
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Split multi-page PDFs • Drag & drop assign • One-click email & zip
            </p>
          </div>
        </div>

        {/* User Account & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Sender Account Login Badge */}
          {currentUser && currentUser.isLoggedIn ? (
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-2 shadow-xs group cursor-pointer"
              title="Click to view or change sender account"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
              </div>
              <div className="text-left leading-tight hidden md:block">
                <div className="flex items-center gap-1.5 font-bold">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{currentUser.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100 font-sans">
                    {currentUser.provider || 'Gmail/Yahoo'}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80 font-mono">
                  {currentUser.email}
                </div>
              </div>
              <div className="md:hidden font-mono font-bold text-[11px] truncate max-w-[120px]">
                {currentUser.email.split('@')[0]}
              </div>
              <span className="text-[10px] bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded font-medium group-hover:underline">
                Switch
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer animate-pulse hover:animate-none"
            >
              <LogIn className="w-4 h-4" />
              <span>Login Sender Email</span>
            </button>
          )}

          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="User Guide"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">User Guide</span>
          </button>

          {!hasDocument && (
            <button
              onClick={onLoadSample}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-slate-700 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Load Sample PDF</span>
            </button>
          )}

          {hasDocument && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Upload New PDF</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

