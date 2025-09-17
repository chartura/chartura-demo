import { useEffect } from 'react';

interface TrialModalProps {
  open: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  onUseDemo?: () => void;
}

export default function TrialModal({ open, onClose, onStartTrial, onUseDemo }: TrialModalProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
        <h3 className="text-xl font-semibold text-slate-900">Start your free 7‑day trial</h3>
        <p className="mt-2 text-sm text-slate-600">
          Import your own files and get instant insights, charts, and AI answers. No credit card required for the trial.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>• Upload Excel, CSV, Google Sheets exports</li>
          <li>• Bring PDFs, Word, PowerPoint — we’ll parse the tables</li>
          <li>• Ask the AI anything about your data</li>
          <li>• Export presentation‑ready visuals</li>
        </ul>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onStartTrial}
            className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white px-4 py-2 font-medium hover:opacity-95"
          >
            Start free trial
          </button>
          {onUseDemo && (
            <button
              onClick={onUseDemo}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium hover:shadow-sm"
            >
              Continue with demo data
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full border border-slate-200 w-8 h-8 flex items-center justify-center hover:bg-slate-50"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
