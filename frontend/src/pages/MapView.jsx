import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Camera, CheckCircle2, Loader2, MapPin, MapPinOff, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import RoadHazardMap from '../components/RoadHazardMap';
import EmptyState from '../components/EmptyState';
import { dashboardApi } from '../services/api';
import { HAZARD_TYPES, SEVERITY_LEVELS, hazardName, severityStyle } from '../utils/severity';
import { DIVISIONS } from '../utils/bangladesh';
import { useLang } from '../i18n';

export default function MapView() {
  const { t, num, hazard: hazardText } = useLang();
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
    const tally = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0, resolved: 0 };
    markers.forEach((m) => {
      tally[m.severityLabel] = (tally[m.severityLabel] || 0) + 1;
      if (m.resolutionStatus === 'resolved') tally.resolved += 1;
    });
    return tally;
  }, [markers]);

  const hazardLabel = (type) => hazardText(type, { name: hazardName(type) }).name;

  return (
    <>
      <PageHeader
        eyebrow={t('map.eyebrow')}
        title={t('map.title')}
        description={t('map.desc')}
        actions={
          <Link to="/report" className="btn-primary btn-glow">
            <Camera className="h-4 w-4" aria-hidden="true" />
            {t('map.add')}
          </Link>
        }
      >
        {/* live summary chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { icon: MapPin, value: markers.length, label: t('map.shown'), color: '#78d8ac' },
            { icon: AlertTriangle, value: counts.CRITICAL, label: t('sev.CRITICAL'), color: '#f87171' },
            { icon: CheckCircle2, value: counts.resolved, label: t('map.resolved'), color: '#4ade80' },
          ].map(({ icon: Icon, value, label, color }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 backdrop-blur"
            >
              <Icon className="h-4 w-4" style={{ color }} aria-hidden="true" />
              <strong className="font-display text-white">{loading ? '…' : num(value)}</strong>
              {label}
            </span>
          ))}
        </div>
      </PageHeader>

      <div className="container-page py-8 sm:py-10">
        <div className="grid gap-4 lg:grid-cols-4">
          <aside className="order-2 space-y-4 lg:order-1 lg:col-span-1">
            <section className="card p-4">
              <h2 className="font-display text-sm font-bold text-ink">{t('map.severity')}</h2>
              <div className="mt-3 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSeverity('ALL')}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                    severity === 'ALL' ? 'bg-brand-gradient text-white shadow-btn-primary' : 'text-ink-soft hover:bg-brand-50'
                  }`}
                >
                  <span>{t('map.allSeverities')}</span>
                  <span className="font-mono text-xs">{severity === 'ALL' ? num(markers.length) : ''}</span>
                </button>
                {[...SEVERITY_LEVELS].reverse().map((level) => {
                  const style = severityStyle(level);
                  const active = severity === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSeverity(level)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                        active ? 'text-white shadow-lg' : 'text-ink-soft hover:bg-brand-50'
                      }`}
                      style={active ? { background: style.hex } : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-white' : ''} ${level === 'CRITICAL' && !active ? 'animate-pulse' : ''}`}
                          style={active ? undefined : { backgroundColor: style.hex }}
                          aria-hidden="true"
                        />
                        {t(`sev.${level}`)}
                      </span>
                      <span className="font-mono text-xs">{severity === 'ALL' || active ? num(counts[level] || 0) : ''}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="card p-4">
              <h2 className="font-display text-sm font-bold text-ink">{t('map.hazardType')}</h2>
              <label htmlFor="map-hazard" className="sr-only">{t('map.hazardType')}</label>
              <select id="map-hazard" className="field mt-3" value={hazard} onChange={(e) => setHazard(e.target.value)}>
                <option value="ALL">{t('map.allHazards')}</option>
                {HAZARD_TYPES.map((type) => (
                  <option key={type} value={type}>{hazardLabel(type)}</option>
                ))}
              </select>

              <h2 className="mt-4 font-display text-sm font-bold text-ink">{t('map.status')}</h2>
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1" role="group" aria-label={t('map.status')}>
                {[
                  ['unresolved', 'map.open'],
                  ['resolved', 'map.resolved'],
                  ['ALL', 'map.everything'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setResolution(value)}
                    aria-pressed={resolution === value}
                    className={`rounded-lg px-1 py-1.5 text-xs font-semibold transition ${
                      resolution === value ? 'bg-white text-brand-800 shadow' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </section>

            <section className="card p-4">
              <h2 className="font-display text-sm font-bold text-ink">{t('map.jump')}</h2>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {DIVISIONS.map((division) => (
                  <button
                    key={division.name}
                    type="button"
                    onClick={() => setFocus([division.lat, division.lng])}
                    className="rounded-lg border border-ink-line px-2 py-1.5 text-xs font-medium text-ink-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    {t(`div.${division.name}`)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setFocus(null)} className="btn-ghost mt-2 w-full text-xs">
                {t('map.reset')}
              </button>
            </section>
          </aside>

          <div className="order-1 lg:order-2 lg:col-span-3">
            {loading && (
              <div className="grid h-[min(640px,72svh)] place-items-center rounded-2xl border border-ink-line bg-night-950">
                <span className="flex flex-col items-center gap-3 text-sm text-white/70">
                  <span className="relative grid h-14 w-14 place-items-center">
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/40" />
                    <Loader2 className="h-7 w-7 animate-spin text-brand-300" aria-hidden="true" />
                  </span>
                  {t('map.loading')}
                </span>
              </div>
            )}

            {!loading && error && (
              <div className="grid h-[min(640px,72svh)] place-items-center rounded-2xl border border-ink-line bg-white p-6 text-center">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">{t('map.errorTitle')}</h2>
                  <p className="mt-1.5 text-sm text-ink-muted">{error}</p>
                  <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t('map.retry')}
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && markers.length === 0 && (
              <div className="h-[min(640px,72svh)]">
                <EmptyState
                  icon={MapPinOff}
                  title={t('map.emptyTitle')}
                  description={t('map.emptyDesc')}
                  actionLabel={t('cta.button')}
                  actionTo="/report"
                />
              </div>
            )}

            {!loading && !error && markers.length > 0 && (
              <>
                <RoadHazardMap markers={markers} height="min(640px, 72svh)" focus={focus} fitToMarkers={!focus} />
                <p className="mt-3 text-xs text-ink-muted">
                  {t('map.footer', { n: num(markers.length) })}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
