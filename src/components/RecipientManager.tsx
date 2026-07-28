import React, { useState } from 'react';
import { Recipient } from '../types';
import { Mail, Plus, UserPlus, Trash2, Tag, Check } from 'lucide-react';

interface RecipientManagerProps {
  recipients: Recipient[];
  onAddRecipient: (email: string, name?: string, colorTag?: string) => void;
  onRemoveRecipient: (id: string) => void;
  onClearAll: () => void;
}

const COLOR_PRESETS = [
  'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800',
  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800',
  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800',
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-800',
  'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-800',
  'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800',
];

export const RecipientManager: React.FC<RecipientManagerProps> = ({
  recipients,
  onAddRecipient,
  onRemoveRecipient,
  onClearAll,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Invalid email format (e.g. user@example.com)');
      return;
    }

    // Check duplicate
    if (recipients.some((r) => r.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      setErrorMsg('This email already exists in the recipient list');
      return;
    }

    onAddRecipient(trimmedEmail, nameInput.trim() || undefined, selectedColor);
    setEmailInput('');
    setNameInput('');
    // Rotate color preset for next contact
    const nextColorIndex = (COLOR_PRESETS.indexOf(selectedColor) + 1) % COLOR_PRESETS.length;
    setSelectedColor(COLOR_PRESETS[nextColorIndex]);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Add Recipient Email ({recipients.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              After adding recipients, you can drag & drop PDF pages directly into their card.
            </p>
          </div>
        </div>

        {recipients.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
            title="Clear all recipients"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear List
          </button>
        )}
      </div>

      {/* Add Recipient Form */}
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-6">
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter recipient email (e.g., user@company.com)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Name / Department (optional)"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500 font-medium pl-1">{errorMsg}</p>
        )}

        {/* Color presets selection */}
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
          <span className="text-[11px] font-medium flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            Color Tag:
          </span>
          <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.map((color, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-5 h-5 rounded-full border transition-transform flex items-center justify-center ${color} ${
                  selectedColor === color ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {selectedColor === color && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
