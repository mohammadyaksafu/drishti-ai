import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Map as MapIcon,
  ArrowRight,
  CircleDot,
  Waves,
  Construction,
  Milestone,
  ScanLine,
  Trash2,
  Users,
  Gauge,
  Layers,
  Building2,
  Satellite,
  ShieldCheck,
  MapPin,
  ChevronDown,
  PlayCircle,
} from 'lucide-react';
import HazardCard from '../components/HazardCard';
import { CountUp, Reveal, spotlightHandler } from '../components/Motion';
import { dashboardApi } from '../services/api';
import { HAZARD_TYPES } from '../utils/severity';
import { useLang } from '../i18n';
import { FlagBD } from '../components/Footer';
import ProcessVideo from '../components/ProcessVideo';

// three.js is only downloaded for the home page, after first paint.
const HeroScene = lazy(() => import('../components/HeroScene'));

const HAZARD_ICONS = {
  pothole: CircleDot,
  road_crack: ScanLine,
  broken_road: Construction,
  open_manhole: Milestone,
  waterlogging: Waves,
  debris: Trash2,
};

/**
 * The five-stage pipeline is the product's whole thesis: DRISHTI AI is not an
 * image classifier, it is the path from a photo on a phone to a prioritised
 * repair on a municipal work order.
 */
const PIPELINE = [
  { key: 'capture', icon: Camera },
  { key: 'detect', icon: ScanLine },
  { key: 'assess', icon: Gauge },
  { key: 'map', icon: MapPin },
  { key: 'prioritise', icon: ShieldCheck },
];

const REASONS = [Users, ScanLine, Gauge, Satellite, Building2, Layers].map((icon, i) => ({
  icon,
  title: `why.${i + 1}.t`,
  body: `why.${i + 1}.b`,
}));

/**
 * An illustrative detection frame: a stylised road with bounding boxes and a
 * scan line, so the hero shows what the product does before anyone reads a word.
 */
function DetectionPreview() {
  return (
    <div className="relative animate-float">
      <div className="absolute -inset-4 rounded-[2rem] bg-brand-600/20 blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-night-900/80 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            drishti · inference
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-sev-low">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sev-low" />
            LIVE
          </span>
        </div>

        {/* The "photo" */}
        <div className="relative aspect-[4/3] overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-[#4b5563] via-[#374151] to-[#1f2937]" />
          <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-[#94a3b8] to-[#64748b]" />
          {/* road perspective */}
          <div
            className="absolute inset-x-0 bottom-0 top-[28%] bg-gradient-to-b from-[#3f3f46] to-[#27272a]"
            style={{ clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)' }}
          />
          <div
            className="absolute bottom-0 left-1/2 top-[28%] w-[3%] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,#fde68a_0_14px,transparent_14px_30px)] opacity-70"
            style={{ clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)' }}
          />
          {/* pothole + crack shapes */}
          <div className="absolute left-[24%] top-[62%] h-[16%] w-[22%] rounded-[50%] bg-[#18181b] shadow-[inset_0_6px_12px_rgba(0,0,0,0.8)]" />
          <div className="absolute left-[62%] top-[48%] h-[2px] w-[18%] rotate-[24deg] bg-[#111]" />
          <div className="absolute left-[66%] top-[52%] h-[2px] w-[12%] -rotate-[18deg] bg-[#111]" />

          {/* bounding boxes */}
          <div className="absolute left-[21%] top-[57%] h-[26%] w-[28%] rounded-md border-2 border-sev-critical">
            <span className="absolute -top-6 left-[-2px] whitespace-nowrap rounded bg-sev-critical px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              pothole 0.91
            </span>
          </div>
          <div className="absolute left-[59%] top-[42%] h-[18%] w-[26%] rounded-md border-2 border-sev-moderate">
            <span className="absolute -top-6 left-[-2px] whitespace-nowrap rounded bg-sev-moderate px-1.5 py-0.5 font-mono text-[10px] font-bold text-night-950">
              road_crack 0.78
            </span>
          </div>

          {/* scan line */}
          <div className="absolute inset-x-0 h-12 animate-scan bg-gradient-to-b from-transparent via-brand-400/25 to-transparent">
            <div className="absolute inset-x-0 bottom-1/2 h-px bg-brand-300/80" />
          </div>
        </div>

        {/* readout */}
        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
          <div className="px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Severity</p>
            <p className="mt-0.5 font-display text-xl font-bold text-sev-critical">
              87<span className="text-xs font-medium text-white/40">/100</span>
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Hazards</p>
            <p className="mt-0.5 font-display text-xl font-bold text-white">2</p>
          </div>
          <div className="px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Band</p>
            <p className="mt-1 inline-block rounded bg-sev-critical px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              CRITICAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, children, center = false }) {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className={`section-title ${center ? 'mx-auto' : ''}`}>{title}</h2>
      {children && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{children}</p>}
    </Reveal>
  );
}


const HEADLINE = [{ key: 'hero.line1' }, { key: 'hero.line2' }, { key: 'hero.line3', gradient: true }];

/** The five pipeline stages, auto-advancing so the story plays itself. */
function Pipeline() {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % PIPELINE.length), 2400);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* track + animated fill */}
        <span
          className="absolute left-[10%] right-[10%] top-9 hidden h-[3px] rounded-full bg-brand-100 lg:block"
          aria-hidden="true"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-500 to-magenta-500 transition-[width] duration-700 ease-out"
            style={{ width: `${(active / (PIPELINE.length - 1)) * 100}%` }}
          />
        </span>
        {PIPELINE.map((step, index) => {
          const done = index <= active;
          const isActive = index === active;
          return (
            <Reveal as="li" key={step.key} delay={index * 110} className="relative">
              <button
                type="button"
                onClick={() => setActive(index)}
                className="group flex w-full flex-col items-center rounded-2xl p-2 text-center"
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl transition-all duration-500 ${
                    done
                      ? 'bg-brand-gradient text-white shadow-glow'
                      : 'bg-white text-brand-700 ring-1 ring-brand-100'
                  } ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}
                >
                  {isActive && (
                    <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-brand-500/40" aria-hidden="true" />
                  )}
                  <step.icon className="relative h-6 w-6" aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white font-mono text-[10px] font-bold text-brand-800 shadow ring-1 ring-ink-line">
                    {index + 1}
                  </span>
                </span>
                <h3
                  className={`mt-5 font-display text-lg font-bold transition-colors ${
                    isActive ? 'text-brand-700' : 'text-ink'
                  }`}
                >
                  {t(`pipe.${step.key}`)}
                </h3>
                <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-ink-muted">{t(`pipe.${step.key}.d`)}</p>
              </button>
            </Reveal>
          );
        })}
      </ol>
    </div>
  );
}

export default function Home() {
  const { t, num, lang } = useLang();
  const [stats, setStats] = useState(null);
  const [hazardCounts, setHazardCounts] = useState({});

  useEffect(() => {
    // Real numbers from MongoDB. If the API is unreachable the section simply
    // hides rather than showing invented figures.
    dashboardApi.statistics().then(setStats).catch(() => setStats(null));
    dashboardApi
      .hazards()
      .then((data) =>
        setHazardCounts(Object.fromEntries(data.hazardDistribution.map((h) => [h.type, h.count])))
      )
      .catch(() => setHazardCounts({}));
  }, []);

  let wordIndex = 0;

  return (
    <div className="-mb-24">
      {/* ---------------------------------------------------------- hero */}
      <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-night-950 text-white">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-3xl"
          aria-hidden="true"
        />
        <Suspense fallback={null}>
          <HeroScene className="absolute inset-0" />
        </Suspense>
        {/* Keep the copy legible over the 3D road. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night-950 via-night-950/70 to-night-950/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night-950 to-transparent"
          aria-hidden="true"
        />

        <div className="container-page relative grid items-center gap-14 pb-24 pt-14 lg:grid-cols-12 lg:pt-20">
          <div className="lg:col-span-7">
            <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-brand-200 backdrop-blur">
              <FlagBD className="h-3 w-5" />
              {t('hero.badge')}
            </p>
            <h1
              className={`mt-6 font-display text-[2.6rem] font-bold tracking-tight [perspective:600px] sm:text-6xl lg:text-7xl ${
                lang === 'bn' ? '!leading-[1.3]' : 'leading-[1.06]'
              }`}
              aria-label={HEADLINE.map((line) => t(line.key)).join(' ')}
            >
              {HEADLINE.map((line, li) => (
                <span key={`${lang}-${li}`} className="block" aria-hidden="true">
                  {t(line.key).split(' ').map((word) => {
                    const delay = 120 + wordIndex++ * 90;
                    return (
                      <span
                        key={`${word}-${delay}`}
                        className={`hero-word mr-[0.25em] ${line.gradient ? 'text-gradient' : ''}`}
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              ))}
            </h1>
            <p
              className="mt-3 animate-fade-up font-bangla text-2xl text-magenta-300 sm:text-3xl"
              style={{ animationDelay: '750ms' }}
            >
              {t('hero.motto')}
            </p>
            <p
              className="mt-5 max-w-xl animate-fade-up text-lg leading-relaxed text-white/70"
              style={{ animationDelay: '900ms' }}
            >
              {t('hero.body')}
            </p>

            <div className="mt-9 grid animate-fade-up gap-3 sm:flex sm:flex-wrap" style={{ animationDelay: '1050ms' }}>
              <Link to="/report" className="btn-primary btn-glow px-6 py-3.5 text-base">
                <Camera className="h-5 w-5" aria-hidden="true" />
                {t('hero.ctaReport')}
              </Link>
              <Link to="/map" className="btn-outline-light px-6 py-3.5 text-base">
                <MapIcon className="h-5 w-5" aria-hidden="true" />
                {t('hero.ctaMap')}
              </Link>
              <a
                href="#watch"
                onClick={() => setTimeout(() => window.dispatchEvent(new Event('drishti:play-video')), 650)}
                className="btn px-4 py-3.5 text-base text-white/80 hover:bg-white/5 hover:text-white"
              >
                <PlayCircle className="h-5 w-5 text-magenta-400" aria-hidden="true" />
                {t('vid.watch')}
              </a>
            </div>

            <ul
              className="mt-6 flex animate-fade-up flex-wrap gap-x-5 gap-y-2 text-sm text-white/60"
              style={{ animationDelay: '1200ms' }}
            >
              {[t('hero.point1'), t('hero.point2'), t('hero.point3')].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sev-low" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            {stats && stats.totals.total > 0 && (
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
                {[
                  [t('hero.statReports'), stats.totals.total],
                  [t('hero.statCritical'), stats.severity.critical],
                  [t('hero.statResolved'), stats.totals.resolved],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-white/50">{label}</dt>
                    <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
                      <CountUp value={value} format={num} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="animate-fade-up lg:col-span-5" style={{ animationDelay: '600ms' }}>
            <DetectionPreview />
          </div>
        </div>

        <a
          href="#how-it-works"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs text-white/50 transition-colors hover:text-white sm:flex"
        >
          {t('hero.scroll')}
          <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
        </a>
      </section>

      {/* --------------------------------------------------- how it works */}
      <section id="how-it-works" className="relative scroll-mt-16 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow={t('how.eyebrow')} title={t('how.title')} center />
          <Pipeline />
          <Reveal className="mt-12 flex justify-center">
            <Link to="/report" className="btn-primary group px-6 py-3">
              <Camera className="h-4 w-4" aria-hidden="true" />
              {t('how.cta')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------- the process, animated */}
      <section id="watch" className="scroll-mt-20 border-t border-ink-line bg-white py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow={t('vid.eyebrow')} title={t('vid.title')} center>
            {t('vid.body')}
          </SectionHeading>
          <Reveal className="mx-auto mt-12 max-w-5xl">
            <ProcessVideo />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------ supported hazards */}
      <section className="border-y border-ink-line bg-white py-20 sm:py-24">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow={t('haz.eyebrow')} title={t('haz.title')}>
              {t('haz.body')}
            </SectionHeading>
            <Reveal>
              <Link to="/reports" className="btn-secondary group">
                {t('haz.browse')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HAZARD_TYPES.map((type, i) => (
              <Reveal key={type} delay={(i % 3) * 100}>
                <HazardCard type={type} icon={HAZARD_ICONS[type]} count={hazardCounts[type] ?? null} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- why drishti */}
      <section className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow={t('why.eyebrow')} title={t('why.title')} />

          <Reveal className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink-line bg-ink-line sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((reason) => (
              <div
                key={reason.title}
                onMouseMove={spotlightHandler}
                className="spotlight group bg-white p-7"
              >
                <span className="icon-tile transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <reason.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-ink">{t(reason.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(reason.body)}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------------- cta */}
      <section className="container-page pb-24">
        <Reveal className="relative overflow-hidden rounded-3xl bg-night-950 px-6 py-14 text-white sm:px-12">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 animate-float rounded-full bg-brand-600/40 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-10 h-60 w-60 animate-float rounded-full bg-magenta-500/20 blur-3xl"
            style={{ animationDelay: '-2.5s' }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">{t('cta.title')}</h2>
              <p className="mt-3 max-w-xl text-lg text-white/60">{t('cta.body')}</p>
            </div>
            <Link to="/report" className="btn-light group shrink-0 px-6 py-3.5 text-base">
              {t('cta.button')}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
