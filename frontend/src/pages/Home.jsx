import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import HazardCard from '../components/HazardCard';
import { dashboardApi } from '../services/api';
import { HAZARD_TYPES } from '../utils/severity';

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
  { stage: 'Capture', icon: Camera, detail: 'A citizen photographs a road defect and shares their GPS position.' },
  { stage: 'Detect', icon: ScanLine, detail: 'A YOLO detector locates every hazard in the frame and classifies it.' },
  { stage: 'Assess', icon: Gauge, detail: 'A severity engine scores how dangerous each defect actually is, 0–100.' },
  { stage: 'Map', icon: MapPin, detail: 'The hazard lands on a live national map as a geospatial data point.' },
  { stage: 'Prioritise', icon: ShieldCheck, detail: 'Authorities work the queue worst-first instead of complaint-first.' },
];

const REASONS = [
  {
    icon: Users,
    title: 'Crowdsourced coverage',
    body: 'Road inspection today is manual, periodic and thin. Thousands of phones already travel every road in the country daily.',
  },
  {
    icon: ScanLine,
    title: 'AI detection',
    body: 'A single trained detector reads six hazard classes from an ordinary photo, with no special hardware on the citizen side.',
  },
  {
    icon: Gauge,
    title: 'Severity, not just confidence',
    body: 'A weighted engine scores defect size, hazard class, detector confidence and road context — because a confident crack is still a minor crack.',
  },
  {
    icon: Satellite,
    title: 'Geospatial intelligence',
    body: 'Every report is a coordinate. Clusters expose the road segments that are failing, not just the individual complaints.',
  },
  {
    icon: Building2,
    title: 'One authority view',
    body: 'City corporations see the whole picture: distribution by severity, by hazard type, by district, and over time.',
  },
  {
    icon: Layers,
    title: 'Built to scale',
    body: 'Asynchronous job architecture. Adding dashcams, buses or CCTV as sources means adding producers, not rewriting the pipeline.',
  },
];

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
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className={`section-title ${center ? 'mx-auto' : ''}`}>{title}</h2>
      {children && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{children}</p>}
    </div>
  );
}

export default function Home() {
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

  return (
    <div className="-mb-24">
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-night-950 text-white">
        <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-magenta-500/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="container-page relative grid items-center gap-14 pb-20 pt-14 lg:grid-cols-12 lg:pb-28 lg:pt-20">
          <div className="animate-fade-up lg:col-span-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-brand-200 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-magenta-400" aria-hidden="true" />
              Road hazard intelligence · Bangladesh
            </p>
            <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              See the road.
              <br />
              Detect the danger.
              <br />
              <span className="text-gradient">Fix the future.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
              DRISHTI AI turns ordinary smartphone road photos into geospatial road-condition data. It
              detects hazards, scores how severe they are, and gives authorities a ranked repair queue
              instead of an inbox of complaints.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/report" className="btn-primary px-6 py-3.5 text-base">
                <Camera className="h-5 w-5" aria-hidden="true" />
                Report a road hazard
              </Link>
              <Link to="/map" className="btn-outline-light px-6 py-3.5 text-base">
                <MapIcon className="h-5 w-5" aria-hidden="true" />
                Explore road map
              </Link>
            </div>

            {stats && stats.totals.total > 0 && (
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
                {[
                  ['Reports', stats.totals.total],
                  ['Critical hazards', stats.severity.critical],
                  ['Resolved', stats.totals.resolved],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-white/50">{label}</dt>
                    <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="lg:col-span-5">
            <DetectionPreview />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- how it works */}
      <section className="relative py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="How it works" title="From a photo on a phone to a prioritised repair" center />

          <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <span
              className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 lg:block"
              aria-hidden="true"
            />
            {PIPELINE.map((step, index) => (
              <li key={step.stage} className="relative flex flex-col items-center text-center">
                <span className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <step.icon className="h-6 w-6" aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white font-mono text-[10px] font-bold text-brand-800 shadow ring-1 ring-ink-line">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-ink">{step.stage}</h3>
                <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-ink-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------ supported hazards */}
      <section className="border-y border-ink-line bg-white py-20 sm:py-24">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Supported hazards" title="Six classes the detector reads today">
              Each class carries its own intrinsic risk weight in the severity engine, so an open manhole
              and a hairline crack are never treated as the same problem.
            </SectionHeading>
            <Link to="/reports" className="btn-secondary">
              Browse reports
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HAZARD_TYPES.map((type) => (
              <HazardCard key={type} type={type} icon={HAZARD_ICONS[type]} count={hazardCounts[type] ?? null} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- why drishti */}
      <section className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Why DRISHTI AI" title="Infrastructure intelligence, not a complaint box" />

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink-line bg-ink-line sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((reason) => (
              <div key={reason.title} className="group bg-white p-7 transition-colors hover:bg-brand-50/40">
                <span className="icon-tile transition-transform group-hover:scale-110">
                  <reason.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-ink">{reason.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- cta */}
      <section className="container-page pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-night-950 px-6 py-14 text-white sm:px-12">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-600/40 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Found a bad stretch of road today?</h2>
              <p className="mt-3 max-w-xl text-lg text-white/60">
                One photo and your location is enough. The analysis comes back in under a minute.
              </p>
            </div>
            <Link to="/report" className="btn-light shrink-0 px-6 py-3.5 text-base">
              Report a hazard
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
