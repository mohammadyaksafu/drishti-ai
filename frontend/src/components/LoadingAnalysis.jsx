import { CheckCircle2, Circle, Loader2, Cpu } from 'lucide-react';
import { formatDuration } from '../utils/format';

const STAGES = [
  { key: 'uploaded', label: 'Image uploaded to secure storage' },
  { key: 'created', label: 'Report created and queued' },
  { key: 'inference', label: 'AI model analysing the image' },
  { key: 'severity', label: 'Severity assessment' },
  { key: 'result', label: 'Final result' },
];

/**
 * The wait screen. A 30–60 second delay feels broken unless the interface
 * explains what is happening, so this shows the real pipeline stage the report
 * is in and states the expected wait up front.
 */
export default function LoadingAnalysis({ status = 'pending', elapsedMs = 0, job = null }) {
  const stageIndex = status === 'processing' ? 2 : 1;

  const stateOf = (index) => {
    if (index < stageIndex) return 'done';
    if (index === stageIndex) return 'active';
    return 'waiting';
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-line bg-brand-900 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
            <Cpu className="h-5 w-5" aria-hidden="true" />
            <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-white/20" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-200">
              Analysis in progress
            </p>
            <h2 className="font-display text-lg font-bold">DRISHTI AI is reading your image</h2>
          </div>
        </div>
      </div>

      <div className="p-6">
        <ol className="space-y-3.5" aria-live="polite">
          {STAGES.map((stage, index) => {
            const state = stateOf(index);
            return (
              <li key={stage.key} className="flex items-center gap-3">
                {state === 'done' && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-sev-low" aria-hidden="true" />
                )}
                {state === 'active' && (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-700" aria-hidden="true" />
                )}
                {state === 'waiting' && (
                  <Circle className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden="true" />
                )}
                <span
                  className={`text-sm ${
                    state === 'waiting'
                      ? 'text-ink-muted'
                      : state === 'active'
                      ? 'font-semibold text-ink'
                      : 'text-ink-soft'
                  }`}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-xl border border-ink-line bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-ink">Estimated processing time</span>
            <span className="font-mono text-sm text-ink-soft">30–60 seconds</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-ink-muted">
            <span>Elapsed</span>
            <span className="font-mono">{formatDuration(elapsedMs)}</span>
          </div>
          {job && (
            <div className="mt-2 flex items-center justify-between gap-4 text-xs text-ink-muted">
              <span>Queue attempt</span>
              <span className="font-mono">{job.attempts || 1}</span>
            </div>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            This prototype runs inference on a local AI machine rather than a cloud GPU, so results take
            up to a minute to come back. This page updates on its own — you can leave it open, or come
            back to it later from your reports.
          </p>
        </div>
      </div>
    </div>
  );
}
