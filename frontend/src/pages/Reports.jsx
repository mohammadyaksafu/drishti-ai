import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, Filter, Search, X, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ReportCard from '../components/ReportCard';
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { reportsApi } from '../services/api';
import { HAZARD_TYPES, SEVERITY_LEVELS, hazardName } from '../utils/severity';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'severity', label: 'Most severe first' },
  { value: 'oldest', label: 'Oldest first' },
];

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ reports: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search') || '');

  const severity = params.get('severity') || 'ALL';
  const hazard = params.get('hazard') || 'ALL';
  const resolution = params.get('resolution') || 'ALL';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(params);
      if (!value || value === 'ALL') next.delete(key);
      else next.set(key, value);
      if (key !== 'page') next.delete('page');
      setParams(next);
    },
    [params, setParams]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    reportsApi
      .list({
        severity,
        hazard,
        resolution,
        sort,
        page,
        limit: 12,
        search: params.get('search') || undefined,
      })
      .then((payload) => !cancelled && setData(payload))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [severity, hazard, resolution, sort, page, params]);

  const hasFilters = severity !== 'ALL' || hazard !== 'ALL' || resolution !== 'ALL' || params.get('search');

  return (
    <>
      <PageHeader
        eyebrow="Public feed"
        title="Reported road hazards"
        description="Every report submitted across Bangladesh. Anyone can browse this feed."
        actions={
          <Link to="/report" className="btn-primary">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Report a hazard
          </Link>
        }
      />
      <div className="container-page py-8 sm:py-10">
        {/* filters */}
        <section className="card p-4" aria-label="Filter reports">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter
            </span>

            <div className="relative min-w-[200px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <label htmlFor="report-search" className="sr-only">
                Search reports by location or description
              </label>
              <input
                id="report-search"
                type="search"
                className="field pl-9"
                placeholder="Search road, landmark or note"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setParam('search', search.trim())}
              />
            </div>

            <label htmlFor="f-severity" className="sr-only">Severity</label>
            <select id="f-severity" className="field w-auto" value={severity} onChange={(e) => setParam('severity', e.target.value)}>
              <option value="ALL">All severities</option>
              {SEVERITY_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>

            <label htmlFor="f-hazard" className="sr-only">Hazard type</label>
            <select id="f-hazard" className="field w-auto" value={hazard} onChange={(e) => setParam('hazard', e.target.value)}>
              <option value="ALL">All hazards</option>
              {HAZARD_TYPES.map((type) => (
                <option key={type} value={type}>{hazardName(type)}</option>
              ))}
            </select>

            <label htmlFor="f-resolution" className="sr-only">Resolution status</label>
            <select id="f-resolution" className="field w-auto" value={resolution} onChange={(e) => setParam('resolution', e.target.value)}>
              <option value="ALL">Open and resolved</option>
              <option value="unresolved">Open only</option>
              <option value="resolved">Resolved only</option>
            </select>

            <label htmlFor="f-sort" className="sr-only">Sort order</label>
            <select id="f-sort" className="field w-auto" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => {
                  setSearch('');
                  setParams(new URLSearchParams());
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </section>

        {/* results */}
        <div className="mt-8">
          {loading && <SkeletonGrid count={6} />}

          {!loading && error && (
            <div className="card p-8 text-center">
              <h2 className="font-display text-lg font-bold text-ink">Could not load reports</h2>
              <p className="mt-1.5 text-sm text-ink-muted">{error}</p>
              <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && data.reports.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={hasFilters ? 'No reports match these filters' : 'No road hazards reported yet'}
              description={
                hasFilters
                  ? 'Try widening the severity or hazard filter, or clear the search.'
                  : 'Be the first to map a hazard. One photo and a location is all it takes.'
              }
              actionLabel={hasFilters ? 'Clear filters' : 'Report a hazard'}
              actionTo={hasFilters ? undefined : '/report'}
              onAction={hasFilters ? () => { setSearch(''); setParams(new URLSearchParams()); } : undefined}
            />
          )}

          {!loading && !error && data.reports.length > 0 && (
            <>
              <p className="mb-4 font-mono text-xs text-ink-muted">
                {data.pagination.total} report{data.pagination.total === 1 ? '' : 's'}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.reports.map((report) => (
                  <ReportCard key={report._id} report={report} />
                ))}
              </div>

              {data.pagination.pages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setParam('page', String(page - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </button>
                  <span className="px-3 font-mono text-sm text-ink-soft">
                    {page} / {data.pagination.pages}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page >= data.pagination.pages}
                    onClick={() => setParam('page', String(page + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
