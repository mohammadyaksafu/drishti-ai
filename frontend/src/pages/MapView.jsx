import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Loader2, MapPinOff, RefreshCw } from 'lucide-react';
import RoadHazardMap from '../components/RoadHazardMap';
import EmptyState from '../components/EmptyState';
import { dashboardApi } from '../services/api';
import { HAZARD_TYPES, SEVERITY_LEVELS, hazardName, severityStyle } from '../utils/severity';
import { DIVISIONS } from '../utils/bangladesh';

export default function MapView() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [hazard, setHazard] = useState('ALL');
  const [resolution, setResolution] = useState('unresolved');
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    dashboardApi
      .map({ severity, hazard, resolution })
      .then((data) => !cancelled && setMarkers(data.markers))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [severity, hazard, resolution]);

  const counts = useMemo(() => {
    const tally = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    markers.forEach((m) => {
      tally[m.severityLabel] = (tally[m.severityLabel] || 0) + 1;
    });
    return tally;
  }, [markers]);

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">National road map · Bangladesh</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">Where the road is failing</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Every analysed hazard as a geospatial point. Marker colour is severity; the ring around it
            scales with the severity score, so the worst clusters stand out before you zoom in.
          </p>
        </div>
        <Link to="/report" className="btn-primary">
          <Camera className="h-4 w-4" aria-hidden="true" />
          Add a hazard
        </Link>
      </header>

      {/* filters */}
      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        <aside className="space-y-4 lg:col-span-1">
          <section className="card p-4">
            <h2 className="font-display text-sm font-bold text-ink">Severity</h2>
            <div className="mt-3 space-y-1.5">
              <button
                type="button"
                onClick={() => setSeverity('ALL')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  severity === 'ALL' ? 'bg-brand-900 text-white' : 'text-ink-soft hover:bg-zinc-100'
                }`}
              >
                <span>All severities</span>
                <span className="font-mono text-xs">{markers.length}</span>
              </button>
              {SEVERITY_LEVELS.map((level) => {
                const style = severityStyle(level);
                const active = severity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      active ? 'bg-brand-900 text-white' : 'text-ink-soft hover:bg-zinc-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: style.hex }}
                        aria-hidden="true"
                      />
                      {style.label}
                    </span>
                    <span className="font-mono text-xs">{counts[level] || 0}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-display text-sm font-bold text-ink">Hazard type</h2>
            <label htmlFor="map-hazard" className="sr-only">Hazard type</label>
            <select
              id="map-hazard"
              className="field mt-3"
              value={hazard}
              onChange={(e) => setHazard(e.target.value)}
            >
              <option value="ALL">All hazards</option>
              {HAZARD_TYPES.map((type) => (
                <option key={type} value={type}>{hazardName(type)}</option>
              ))}
            </select>

            <h2 className="mt-4 font-display text-sm font-bold text-ink">Repair status</h2>
            <label htmlFor="map-resolution" className="sr-only">Repair status</label>
            <select
              id="map-resolution"
              className="field mt-3"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              <option value="unresolved">Open hazards</option>
              <option value="resolved">Resolved</option>
              <option value="ALL">Show everything</option>
            </select>
          </section>

          <section className="card p-4">
            <h2 className="font-display text-sm font-bold text-ink">Jump to division</h2>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {DIVISIONS.map((division) => (
                <button
                  key={division.name}
                  type="button"
                  onClick={() => setFocus([division.lat, division.lng])}
                  className="rounded-lg border border-ink-line px-2 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-300 hover:bg-brand-50"
                >
                  {division.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="btn-ghost mt-2 w-full text-xs"
            >
              Reset view
            </button>
          </section>
        </aside>

        <div className="lg:col-span-3">
          {loading && (
            <div className="grid h-[600px] place-items-center rounded-2xl border border-ink-line bg-white">
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="h-5 w-5 animate-spin text-brand-700" aria-hidden="true" />
                Loading hazard map…
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="grid h-[600px] place-items-center rounded-2xl border border-ink-line bg-white p-6 text-center">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">The map could not load</h2>
                <p className="mt-1.5 text-sm text-ink-muted">{error}</p>
                <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && markers.length === 0 && (
            <div className="h-[600px]">
              <EmptyState
                icon={MapPinOff}
                title="No hazards match this view"
                description="Nothing has been mapped for these filters yet. Widen the filters, or add the first report for this area."
                actionLabel="Report a hazard"
                actionTo="/report"
              />
            </div>
          )}

          {!loading && !error && markers.length > 0 && (
            <>
              <RoadHazardMap markers={markers} height="600px" focus={focus} fitToMarkers={!focus} />
              <p className="mt-3 font-mono text-xs text-ink-muted">
                {markers.length} hazard{markers.length === 1 ? '' : 's'} shown · coverage limited to Bangladesh
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
