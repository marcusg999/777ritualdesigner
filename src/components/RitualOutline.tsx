'use client';

import type { RitualStep, EnrichmentData } from '@/lib/types';

interface RitualOutlineProps {
  steps: RitualStep[];
  disclaimer: string;
  enrichment?: EnrichmentData;
}

export default function RitualOutline({ steps, disclaimer, enrichment }: RitualOutlineProps) {
  const allSteps = enrichment?.additionalSteps ? [...steps, ...enrichment.additionalSteps] : steps;

  return (
    <div className="card space-y-5">
      <h3 className="text-lg font-serif text-gold font-semibold">Ritual Outline</h3>

      <ol className="space-y-4">
        {allSteps.map((step, index) => (
          <li key={index} className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold text-xs font-bold font-serif">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-gold/70 font-semibold mb-1">
                {step.phase}
              </p>
              <p className="text-sm text-foreground/85 leading-relaxed">{step.action}</p>
              {step.notes && (
                <p className="text-xs text-foreground/40 mt-1 italic">{step.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-foreground/40 leading-relaxed italic">
          ⚐ {disclaimer}
        </p>
      </div>
    </div>
  );
}
