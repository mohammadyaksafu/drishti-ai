import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Activity, AlertOctagon, CheckCircle2, FileBarChart, Gauge, Users, Map as MapIcon, Cpu, TriangleAlert,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { SkeletonStats } from '../components/Skeleton';
import { SeverityBadge } from '../components/StatusBadge';
import { dashboardApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hazardName, severityStyle } from '../utils/severity';
import { formatDate, timeAgo } from '../utils/format';

const SEV_COLORS = { LOW: '#16a34a', MODERATE: '#f59e0b', HIGH: '#ea580c', CRITICAL: '#dc2626' };

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e1e8e4',
  boxShadow: '0 12px 32px rgba(20,21,43,0.12)',
  fontSize: 13,
};

export default function Dashboard() {
  const { isStaff } = useAuth();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([dashboardApi.statistics(), dashboardApi.hazards({ days: 30 })])
      .then(([statistics, hazards]) => {
        if (cancelled) return;
        setStats(statistics);
        setCharts(hazards);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    // Worker health is staff-only, so a 403 here is expected for citizens.
    if (isStaff) dashboardApi.pipeline().then(setPipeline).catch(() => setPipeline(null));

    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="skeleton h-8 w-64" />
        <div className="mt-8"><SkeletonStats count={4} /></div>
        <div className="skeleton mt-6 h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-20 text-center">
        <TriangleAlert className="mx-auto h-10 w-10 text-red-600" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">The dashboard could not load</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">{error}</p>
        <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  const empty = !stats || stats.totals.total === 0;

  if (empty) {
    return (
      <>
        <PageHeader eyebrow="Authority dashboard" title="Road condition overview" />
        <div className="container-page py-10">
          <EmptyState
            icon={FileBarChart}
            title="No data to show yet"
            description="Statistics appear here as soon as the first hazard report has been analysed."
            actionLabel="Submit the first report"
            actionTo="/report"
          />
        </div>
      </>
    );
  }

  const severityData = charts.severityDistribution.filter((s) => s.count > 0);
  const hazardData = charts.hazardDistribution
    .filter((h) => h.count > 0)
    .map((h) => ({ ...h, name: hazardName(h.type) }));
  const timeData = charts.reportsOverTime.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Authority dashboard"
        title="Road condition overview"
        description="Live figures from every analysed report across Bangladesh."
        actions={
          <Link to="/map" className="btn-outline-light">
            <MapIcon className="h-4 w-4" aria-hidden="true" />
            Open road map
          </Link>
        }
      />
      <div className="container-page py-8 sm:py-10">
        {/* headline stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Headline statistics">
          <StatCard label="Total reports" value={stats.totals.total} icon={FileBarChart} accent="#006a4e" />
          <StatCard
            label="Critical hazards"
            value={stats.severity.critical}
            hint="Needs immediate action"
            icon={AlertOctagon}
            accent="#dc2626"
          />
          <StatCard
            label="Resolved"
            value={stats.totals.resolved}
            hint={`${stats.resolutionRate}% resolution rate`}
            icon={CheckCircle2}
            accent="#16a34a"
          />
          <StatCard
            label="Average severity"
            value={`${stats.severity.average}/100`}
            icon={Gauge}
            accent="#ea580c"
          />
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Secondary statistics">
          <StatCard label="High severity" value={stats.severity.high} accent="#ea580c" />
          <StatCard label="Moderate severity" value={stats.severity.moderate} accent="#f59e0b" />
          <StatCard label="Low severity" value={stats.severity.low} accent="#16a34a" />
          <StatCard label="Contributors" value={stats.totals.contributors} icon={Users} accent="#0c8158" />
        </section>

        {/* pipeline health — staff only */}
        {isStaff && pipeline && (
          <section className="card mt-6 p-5" aria-label="AI pipeline health">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="icon-tile">
                  <Cpu className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Local ML worker</h2>
                  <p className="text-sm text-ink-muted">
                    {pipeline.workerOnline
                      ? `Active · last job completed ${timeAgo(pipeline.lastCompletedAt)}`
                      : 'Idle or offline — queued reports will process once the worker is running'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 font-mono text-sm">
                {Object.entries(pipeline.jobs).map(([key, value]) => (
                  <span key={key} className="text-ink-soft">
                    <span className="text-xs uppercase tracking-wider text-ink-muted">{key} </span>
                    <span className="font-bold text-ink">{value}</span>
                  </span>
                ))}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    pipeline.workerOnline ? 'bg-green-50 text-green-800' : 'bg-zinc-100 text-ink-soft'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                  {pipeline.workerOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* charts */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="font-display text-base font-bold text-ink">Reports over time</h2>
            <p className="mb-4 mt-0.5 text-sm text-ink-muted">Last 30 days</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timeData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c8158" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0c8158" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ede9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#66786f' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#66786f' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="reports" name="Reports" stroke="#0c8158" strokeWidth={2} fill="url(#fillReports)" />
                <Area type="monotone" dataKey="critical" name="Critical" stroke="#dc2626" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold text-ink">Severity distribution</h2>
            <p className="mb-4 mt-0.5 text-sm text-ink-muted">Across all analysed reports</p>
            {severityData.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">No analysed reports yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {severityData.map((entry) => (
                      <Cell key={entry.label} fill={SEV_COLORS[entry.label]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold text-ink">Hazard types</h2>
            <p className="mb-4 mt-0.5 text-sm text-ink-muted">What the detector is finding</p>
            {hazardData.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">No hazards detected yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hazardData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6ede9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#66786f' }} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={54} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#66786f' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eefbf4' }} />
                  <Bar dataKey="count" name="Reports" radius={[6, 6, 0, 0]} fill="#006a4e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold text-ink">Districts by report volume</h2>
            <p className="mb-4 mt-0.5 text-sm text-ink-muted">Top reporting areas</p>
            {charts.districts.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">
                No district data yet — districts are set automatically from report coordinates.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.districts} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6ede9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#66786f' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="district" width={90} tick={{ fontSize: 11, fill: '#66786f' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eefbf4' }} />
                  <Bar dataKey="count" name="Reports" radius={[0, 6, 6, 0]} fill="#1ba06d" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </div>

        {/* priority queue */}
        <section className="card mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-line px-5 py-4">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Repair priority queue</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                Highest severity, still open. This is the queue to work first.
              </p>
            </div>
            <Link to="/reports?sort=severity&resolution=unresolved" className="btn-ghost text-sm">
              View all
            </Link>
          </div>

          {charts.topCritical.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              Nothing open right now. Every analysed hazard has been marked resolved.
            </p>
          ) : (
            <ul className="divide-y divide-ink-line">
              {charts.topCritical.map((report) => {
                const style = severityStyle(report.severityLabel);
                return (
                  <li key={report._id}>
                    <Link
                      to={`/report/${report._id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-50"
                    >
                      <span
                        className="h-9 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: style.hex }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">
                          {hazardName(report.primaryHazard)}
                        </span>
                        <span className="block truncate text-sm text-ink-muted">
                          {report.locationName || report.district || 'Unnamed road'} · {formatDate(report.createdAt)}
                        </span>
                      </span>
                      <SeverityBadge label={report.severityLabel} score={report.overallSeverity} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
