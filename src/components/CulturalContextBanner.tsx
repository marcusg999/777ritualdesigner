'use client';

import { useState } from 'react';

export default function CulturalContextBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-950/60 border border-amber-600/40 rounded-lg p-4 flex items-start gap-3">
      <div className="text-amber-400 mt-0.5 shrink-0 text-lg">⚠</div>
      <div className="flex-1">
        <p className="text-amber-200 text-sm font-semibold mb-1">Cultural Respect Notice</p>
        <p className="text-amber-300/80 text-sm leading-relaxed">
          Some traditions (including Ifá and Vodou) contain initiatory practices not appropriate to replicate without proper initiation. This tool presents only general symbolic information. We encourage respectful study and recognition of living traditions.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss notice"
        className="text-amber-400/60 hover:text-amber-400 transition-colors shrink-0 mt-0.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
