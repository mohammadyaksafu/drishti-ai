import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Shield, Trash2, CheckCircle2, Search, Cpu, Loader2, Activity, RotateCcw,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { SkeletonRows } from '../components/Skeleton';
import { SeverityBadge, StatusBadge, ResolutionBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { adminApi, dashboardApi, reportsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hazardName } from '../utils/severity';
import { formatDate, timeAgo } from '../utils/format';

const TABS = [
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'User accounts' },
  { key: 'pipeline', label: 'AI pipeline' },
];

/* ------------------------------------------------------------ reports */
function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    reportsApi
      .list({ limit: 40, sort: 'severity', resolution: filter === 'ALL' ? undefined : filter })
      .then((data) => setReports(data.reports))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  async function toggle(report) {
    setBusyId(report._id);
    try {
      await adminApi.resolveReport(report._id, {
        resolutionStatus: report.resolutionStatus === 'resolved' ? 'unresolved' : 'resolved',
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function remove(report) {
    if (!window.confirm('Delete this report permanently?')) return;
    setBusyId(report._id);
    try {
      await adminApi.deleteReport(report._id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          ['ALL', 'All'],
          ['unresolved', 'Open'],
          ['resolved', 'Resolved'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === value ? 'bg-brand-900 text-white' : 'bg-white text-ink-soft hover:bg-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={load} className="btn-ghost ml-auto text-sm">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {loading && <SkeletonRows count={6} />}

      {!loading && reports.length === 0 && (
        <EmptyState icon={Shield} title="No reports here" description="Nothing matches this filter yet." />
      )}

      {!loading && reports.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-line bg-zinc-50 text-left font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Hazard</th>
                  <th scope="col" className="px-4 py-3 font-medium">Location</th>
                  <th scope="col" className="px-4 py-3 font-medium">Severity</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Reported</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link to={`/report/${report._id}`} className="font-semibold text-ink hover:text-brand-800">
                        {report.status === 'completed' ? hazardName(report.primaryHazard) : '—'}
                      </Link>
                      <span className="block text-xs text-ink-muted">{report.reporterName}</span>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-ink-soft">
                      {report.locationName || report.district || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {report.status === 'completed' ? (
                        <SeverityBadge label={report.severityLabel} score={report.overallSeverity} />
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {report.status === 'completed' ? (
                        <ResolutionBadge status={report.resolutionStatus} />
                      ) : (
                        <StatusBadge status={report.status} />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggle(report)}
                          disabled={busyId === report._id}
                          className="btn-ghost px-2 py-1.5 text-xs"
                          title={report.resolutionStatus === 'resolved' ? 'Reopen' : 'Mark resolved'}
                        >
                          {busyId === report._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span className="sr-only">
                            {report.resolutionStatus === 'resolved' ? 'Reopen report' : 'Mark report resolved'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(report)}
                          disabled={busyId === report._id}
                          className="btn-ghost px-2 py-1.5 text-xs text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">Delete report</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- users */
function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(
    (term = '') => {
      setLoading(true);
      adminApi
        .users({ search: term || undefined, limit: 50 })
        .then((data) => setUsers(data.users))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => load(), [load]);

  async function changeRole(user, role) {
    setBusyId(user.id);
    try {
      await adminApi.updateUser(user.id, { role });
      load(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function toggleActive(user) {
    setBusyId(user.id);
    try {
      await adminApi.updateUser(user.id, { isActive: !user.isActive });
      load(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete ${user.name}'s account? Their reports will stay on the map.`)) return;
    setBusyId(user.id);
    try {
      await adminApi.deleteUser(user.id);
      load(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <label htmlFor="user-search" className="sr-only">Search accounts</label>
        <input
          id="user-search"
          type="search"
          className="field pl-9"
          placeholder="Search name, email or division"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search.trim())}
        />
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {loading && <SkeletonRows count={6} />}

      {!loading && users.length === 0 && (
        <EmptyState icon={Users} title="No accounts found" description="Nothing matches that search." />
      )}

      {!loading && users.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-line bg-zinc-50 text-left font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Account</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Reports</th>
                  <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-zinc-50 ${user.isActive ? '' : 'opacity-55'}`}>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink">{user.name}</span>
                      <span className="block text-xs text-ink-muted">{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <label htmlFor={`role-${user.id}`} className="sr-only">Role for {user.name}</label>
                      <select
                        id={`role-${user.id}`}
                        className="field w-auto py-1.5 text-xs"
                        value={user.role}
                        disabled={busyId === user.id || user.id === currentUserId}
                        onChange={(e) => changeRole(user, e.target.value)}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="authority">Authority</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-soft">{user.reportCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-muted">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          disabled={busyId === user.id || user.id === currentUserId}
                          className="btn-ghost px-2.5 py-1.5 text-xs"
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(user)}
                          disabled={busyId === user.id || user.id === currentUserId}
                          className="btn-ghost px-2 py-1.5 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">Delete {user.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- pipeline */
function PipelineTab() {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    dashboardApi.pipeline().then(setPipeline).catch(() => setPipeline(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // The queue is a live thing, so keep this view fresh while it is open.
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && !pipeline) return <SkeletonRows count={4} />;
  if (!pipeline) {
    return <EmptyState icon={Cpu} title="Pipeline data unavailable" description="The API could not return worker status." />;
  }

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-800">
            <Cpu className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-ink">Local ML worker</h3>
            <p className="text-sm text-ink-muted">
              {pipeline.workerOnline
                ? `Active · last job ${timeAgo(pipeline.lastCompletedAt)}`
                : 'No job completed in the last 10 minutes'}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
            pipeline.workerOnline ? 'bg-green-50 text-green-800' : 'bg-zinc-100 text-ink-soft'
          }`}
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          {pipeline.workerOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Pending" value={pipeline.jobs.pending} accent="#71717a" />
        <StatCard label="Processing" value={pipeline.jobs.processing} accent="#7c3aed" />
        <StatCard label="Completed" value={pipeline.jobs.completed} accent="#16a34a" />
        <StatCard label="Failed" value={pipeline.jobs.failed} accent="#dc2626" />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-line px-5 py-4">
          <h3 className="font-display text-base font-bold text-ink">Recent jobs</h3>
          <p className="mt-0.5 text-sm text-ink-muted">Refreshes every 15 seconds</p>
        </div>
        {pipeline.recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">No jobs have run yet.</p>
        ) : (
          <ul className="divide-y divide-ink-line">
            {pipeline.recent.map((job) => (
              <li key={job._id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-ink-soft">#{String(job._id).slice(-8)}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {job.reportId?.locationName || 'Unnamed location'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink-muted">attempt {job.attempts}</span>
                  <StatusBadge status={job.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- container */
export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('reports');

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">Admin panel</h1>
          <p className="mt-2 text-ink-soft">
            Manage accounts, close out repairs, and watch the AI pipeline.
          </p>
        </div>
        <Link to="/dashboard" className="btn-secondary">Open dashboard</Link>
      </header>

      <div className="mt-8 flex gap-1 border-b border-ink-line" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === item.key
                ? 'border-brand-800 text-brand-900'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'reports' && <ReportsTab />}
        {tab === 'users' && <UsersTab currentUserId={user?.id} />}
        {tab === 'pipeline' && <PipelineTab />}
      </div>
    </div>
  );
}
