import { CheckCircle2, Circle, Loader2, Cpu } from 'lucide-react';
import { formatDuration } from '../utils/format';
import { useLang } from '../i18n';

const STAGES = ['ana.st1', 'ana.st2', 'ana.st3', 'ana.st4', 'ana.st5'];

/**
 * The wait screen. A 30–60 second delay feels broken unless the interface
 * explains what is happening, so this shows the photo being scanned, the real
 * pipeline stage the report is in, and the expected wait up front.
 */
export default function LoadingAnalysis({ status = 'pending', elapsedMs = 0, job = null, imageUrl = '' }) {
  const { t, num } = useLang();
  const stageIndex = status === 'processing' ? 2 : 1;
  // A soft, honest progress estimate against the 60 s upper bound.
  const estimate = Math.min(95, Math.round((elapsedMs / 60000) * 100));

  const stateOf = (index) => {
    if (index < stageIndex) return 'done';
    if (index === stageIndex) return 'active';
    return 'waiting';
  };

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="relative overflow-hidden border-b border-ink-line bg-night-950 px-6 py-5 text-white">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
            <Cpu className="h-5 w-5" aria-hidden="true" />
            <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-white/20" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-200">{t('ana.eyebrow')}</p>
            <h2 className="font-display text-lg font-bold">{t('ana.title')}</h2>
          </div>
        </div>
      </div>

      {imageUrl && (
        <div className="relative aspect-[16/9] overflow-hidden bg-night-950" aria-hidden="true">
          <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-80" />
          <div className="bg-grid absolute inset-0 opacity-60" />
          {/* corner brackets */}
          {['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map(
            (pos) => (
              <span key={pos} className={`absolute h-6 w-6 rounded-sm border-brand-300 ${pos}`} />
            )
          )}
          <div className="scan-sweep absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-magenta-400/30 to-transparent">
            <div className="absolute inset-x-0 top-1/2 h-px bg-magenta-300 shadow-[0_0_12px_2px_rgba(244,42,65,0.8)]" />
          </div>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-night-950/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">
            {t('ana.scanning')} · {num(formatDuration(elapsedMs))}
          </span>
        </div>
      )}

      <div className="p-6">
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t('ana.progress')}</span>
            <span className="font-mono">{num(estimate)}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-brand-600 to-magenta-500 transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.max(estimate, 6)}%` }}
            >
              <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
          </div>
        </div>

        <ol className="space-y-3.5" aria-live="polite">
          {STAGES.map((stage, index) => {
            const state = stateOf(index);
            return (
              <li
                key={stage}
                className={`flex items-center gap-3 rounded-lg px-2 py-1 transition-colors ${
                  state === 'active' ? 'bg-brand-50' : ''
                }`}
              >
                {state === 'done' && <CheckCircle2 className="h-5 w-5 shrink-0 text-sev-low" aria-hidden="true" />}
                {state === 'active' && (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-700" aria-hidden="true" />
                )}
                {state === 'waiting' && <Circle className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden="true" />}
                <span
                  className={`text-sm ${
                    state === 'waiting' ? 'text-ink-muted' : state === 'active' ? 'font-semibold text-ink' : 'text-ink-soft'
                  }`}
                >
                  {t(stage)}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-xl border border-ink-line bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-ink">{t('ana.time')}</span>
            <span className="font-mono text-sm text-ink-soft">{t('ana.timeVal')}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-ink-muted">
            <span>{t('ana.elapsed')}</span>
            <span className="font-mono">{num(formatDuration(elapsedMs))}</span>
          </div>
          {job && (
            <div className="mt-2 flex items-center justify-between gap-4 text-xs text-ink-muted">
              <span>{t('ana.attempt')}</span>
              <span className="font-mono">{num(job.attempts || 1)}</span>
            </div>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {t('ana.note')}
          </p>
        </div>
      </div>
    </div>
  );
}
