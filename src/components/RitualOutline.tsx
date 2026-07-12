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
      <h3 className="text-xl font-display text-gold font-semibold">Ritual Outline</h3>

      <ol className="space-y-5">
        {allSteps.map((step, index) => (
          <li key={index} className="flex gap-3.5">
            <div className="step-num" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="section-label mb-1">{step.phase}</p>
              <p className="text-[0.95rem] text-foreground/85 leading-relaxed">{step.action}</p>
              {step.notes && (
                <p className="text-sm text-foreground/45 mt-1 italic">{step.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="pt-4" style={{ borderTop: '1px solid var(--hairline)' }}>
        <p className="text-sm text-foreground/45 leading-relaxed italic">
          ⚐ {disclaimer}
        </p>
      </div>
    </div>
  );
}
