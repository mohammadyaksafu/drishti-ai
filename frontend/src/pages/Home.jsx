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
 * The five-stage pipeline is the product's whole thesis, so it is the hero:
 * DRISHTI AI is not an image classifier, it is the path from a photo on a
 * phone to a prioritised repair on a municipal work order.
 */
const PIPELINE = [
  { stage: 'Capture', detail: 'A citizen photographs a road defect and shares their GPS position.' },
  { stage: 'Detect', detail: 'A YOLO detector locates every hazard in the frame and classifies it.' },
  { stage: 'Assess', detail: 'A severity engine scores how dangerous each defect actually is, 0–100.' },
  { stage: 'Map', detail: 'The hazard lands on a live national map as a geospatial data point.' },
  { stage: 'Prioritise', detail: 'Authorities work the queue worst-first instead of complaint-first.' },
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
    <div>
      {/* ---------------------------------------------------------- hero */}
      <section className="border-b border-ink-line bg-white">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <p className="eyebrow">Road hazard intelligence · Bangladesh</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              See the road.
              <br />
              Detect the danger.
              <br />
              <span className="text-brand-800">Fix the future.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              DRISHTI AI turns ordinary smartphone road photos into geospatial road-condition data. It
              detects hazards, scores how severe they are, and gives authorities a ranked repair queue
              instead of an inbox of complaints.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/report" className="btn-primary px-5 py-3 text-base">
                <Camera className="h-5 w-5" aria-hidden="true" />
                Report a road hazard
              </Link>
              <Link to="/map" className="btn-secondary px-5 py-3 text-base">
                <MapIcon className="h-5 w-5" aria-hidden="true" />
                Explore road map
              </Link>
            </div>

            {stats && stats.totals.total > 0 && (
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-line pt-6">
                {[
                  ['Reports', stats.totals.total],
                  ['Critical hazards', stats.severity.critical],
                  ['Resolved', stats.totals.resolved],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-ink-muted">{label}</dt>
                    <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* The pipeline rail: the signature structural device of the page.
              Numbered because these stages genuinely are a sequence. */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-ink-line bg-canvas p-6">
              <p className="eyebrow">The pipeline</p>
              <ol className="mt-5 space-y-0">
                {PIPELINE.map((step, index) => (
                  <li key={step.stage} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < PIPELINE.length - 1 && (
                      <span
                        className="absolute left-[15px] top-8 h-full w-px bg-ink-line"
                        aria-hidden="true"
                    />
                    )}
                    <span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-900 font-mono text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="pt-1">
                      <p className="font-display text-sm font-bold uppercase tracking-wide text-ink">
                        {step.stage}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- how it works */}
      <section className="border-b border-ink-line bg-canvas py-16">
        <div className="container-page">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-ink">
            From a photo on a phone to a prioritised repair
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((step, index) => (
              <div key={step.stage} className="card flex flex-col p-5">
                <span className="font-mono text-xs font-bold text-brand-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-display text-base font-bold text-ink">{step.stage}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ supported hazards */}
      <section className="border-b border-ink-line bg-white py-16">
        <div className="container-page">
          <p className="eyebrow">Supported hazards</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-ink">
            Six classes the detector reads today
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Each class carries its own intrinsic risk weight in the severity engine, so an open manhole
            and a hairline crack are never treated as the same problem.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HAZARD_TYPES.map((type) => (
              <HazardCard
                key={type}
                type={type}
                icon={HAZARD_ICONS[type]}
                count={hazardCounts[type] ?? null}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- why drishti */}
      <section className="bg-canvas py-16">
        <div className="container-page">
          <p className="eyebrow">Why DRISHTI AI</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-ink">
            Infrastructure intelligence, not a complaint box
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((reason) => (
              <div key={reason.title} className="card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-800">
                  <reason.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-ink">{reason.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- cta */}
      <section className="bg-brand-900 py-16 text-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Found a bad stretch of road today?
            </h2>
            <p className="mt-2 max-w-xl text-brand-200">
              One photo and your location is enough. The analysis comes back in under a minute.
            </p>
          </div>
          <Link
            to="/report"
            className="btn inline-flex bg-white px-5 py-3 text-base text-brand-900 hover:bg-brand-50"
          >
            Report a hazard
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
