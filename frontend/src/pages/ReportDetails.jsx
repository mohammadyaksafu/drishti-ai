import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Cpu,
  Loader2,
  MapPin,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import useReportPolling from '../hooks/useReportPolling';
import LoadingAnalysis from '../components/LoadingAnalysis';
import SeverityMeter from '../components/SeverityMeter';
import RoadHazardMap from '../components/RoadHazardMap';
import { SeverityBadge, ResolutionBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { reportsApi, adminApi } from '../services/api';
import { hazardName, severityStyle, LIFECYCLE_STEPS } from '../utils/severity';
import { formatCoords, formatDate, formatDuration } from '../utils/format';

function LifecycleRail({ current }) {
  const index = LIFECYCLE_STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {LIFECYCLE_STEPS.map((step, i) => {
        const done = i <= index;
        return (
          <li key={step.key} className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                done ? 'bg-brand-gradient text-white shadow-btn-primary' : 'bg-zinc-100 text-ink-muted'
              }`}
            >
              {step.label}
            </span>
            {i < LIFECYCLE_STEPS.length - 1 && (
              <span className={`h-px w-3 ${done ? 'bg-brand-300' : 'bg-ink-line'}`} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isStaff, isAdmin } = useAuth();

  const { report, job, loading, error, elapsedMs, timedOut, isProcessing, refresh } =
    useReportPolling(id, { intervalMs: 6000 });

  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    document.title = report
      ? `Report · ${hazardName(report.primaryHazard)} · DRISHTI AI`
      : 'Report · DRISHTI AI';
  }, [report]);

  const isOwner = user && report?.reportedBy && String(report.reportedBy) === String(user.id);

  async function handleRetry() {
    setBusy('retry');
    setActionError('');
    try {
      await reportsApi.retry(id);
      await refresh();
      window.location.reload(); // restart polling cleanly on the new job
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this report permanently? This cannot be undone.')) return;
    setBusy('delete');
    try {
      await reportsApi.remove(id);
      navigate('/reports', { replace: true });
    } catch (err) {
      setActionError(err.message);
      setBusy('');
    }
  }

  async function toggleResolution() {
    setBusy('resolve');
    setActionError('');
    try {
      await adminApi.resolveReport(id, {
        resolutionStatus: report.resolutionStatus === 'resolved' ? 'unresolved' : 'resolved',
      });
      await refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  }

  /* ------------------------------------------------------------ states */
  if (loading && !report) {
    return (
      <div className="container-page py-16">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton mt-6 h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="container-page py-20 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-600" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">This report could not be loaded</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">{error}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={refresh} className="btn-primary">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link to="/reports" className="btn-secondary">
            All reports
          </Link>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const style = severityStyle(report.severityLabel);
  const analysed = report.status === 'completed';

  return (
    <div className="container-page py-8 lg:py-12">
      <Link to="/reports" className="btn-ghost -ml-2 mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All reports
      </Link>

      {/* ------------------------------------------------ in progress */}
      {isProcessing && !timedOut && (
        <div className="mx-auto max-w-2xl">
          <LoadingAnalysis status={report.status} elapsedMs={elapsedMs} job={job} imageUrl={report.imageUrl} />
        </div>
      )}

      {isProcessing && timedOut && (
        <div className="mx-auto max-w-2xl card p-6 text-center">
          <Clock className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-ink">This is taking longer than usual</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            The local AI machine may be offline or working through a backlog. Your report is safe and
            still queued — reload this page to check again, or come back later.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-5">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Check again
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- failed */}
      {report.status === 'failed' && (
        <div className="mx-auto max-w-2xl card border-red-200 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-600" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-ink">AI analysis failed</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {report.failureReason || 'The model could not process this image.'}
          </p>
          <img
            src={report.imageUrl}
            alt="The road image you submitted"
            className="mx-auto mt-5 max-h-64 rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={handleRetry}
            disabled={busy === 'retry'}
            className="btn-primary mt-5"
          >
            {busy === 'retry' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Retry analysis
          </button>
        </div>
      )}

      {/* -------------------------------------------------- completed */}
      {analysed && (
        <div className="animate-fade-up">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">AI road hazard analysis</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
                {hazardName(report.primaryHazard)}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SeverityBadge label={report.severityLabel} score={report.overallSeverity} />
                <ResolutionBadge status={report.resolutionStatus} />
                <span className="font-mono text-xs text-ink-muted">
                  {report.detections?.length || 0} detection
                  {report.detections?.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isStaff && (
                <button
                  type="button"
                  onClick={toggleResolution}
                  disabled={busy === 'resolve'}
                  className={report.resolutionStatus === 'resolved' ? 'btn-secondary' : 'btn-primary'}
                >
                  {busy === 'resolve' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {report.resolutionStatus === 'resolved' ? 'Reopen' : 'Mark resolved'}
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy === 'delete'}
                  className="btn-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              )}
            </div>
          </header>

          {actionError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {actionError}
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-ink-line bg-white p-4">
            <LifecycleRail current={report.lifecycle} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* images */}
            <div className="space-y-4 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <figure className="card overflow-hidden">
                  <img
                    src={report.imageUrl}
                    alt="Original photo submitted by the reporter"
                    className="h-56 w-full object-cover"
                  />
                  <figcaption className="border-t border-ink-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Original
                  </figcaption>
                </figure>

                <figure className="card overflow-hidden">
                  {report.annotatedImageUrl ? (
                    <img
                      src={report.annotatedImageUrl}
                      alt="The same photo with AI-detected hazards outlined"
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-56 place-items-center bg-zinc-50 px-4 text-center text-sm text-ink-muted">
                      No annotated image — the detector found nothing above the confidence threshold.
                    </div>
                  )}
                  <figcaption
                    className="border-t border-ink-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: style.hex }}
                  >
                    AI annotated
                  </figcaption>
                </figure>
              </div>

              {/* detections table */}
              {report.detections?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="border-b border-ink-line px-5 py-3.5">
                    <h2 className="font-display text-base font-bold text-ink">Detections</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Confidence is how sure the detector is. Severity is how dangerous it is. They are
                      scored separately.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-line bg-zinc-50 text-left font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                          <th scope="col" className="px-5 py-2.5 font-medium">Hazard</th>
                          <th scope="col" className="px-5 py-2.5 font-medium">Confidence</th>
                          <th scope="col" className="px-5 py-2.5 font-medium">Frame area</th>
                          <th scope="col" className="px-5 py-2.5 font-medium">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-line">
                        {report.detections.map((det, i) => {
                          const detStyle = severityStyle(det.severityLabel);
                          return (
                            <tr key={i}>
                              <td className="px-5 py-3 font-semibold text-ink">{hazardName(det.type)}</td>
                              <td className="px-5 py-3 font-mono text-ink-soft">
                                {Math.round(det.confidence * 100)}%
                              </td>
                              <td className="px-5 py-3 font-mono text-ink-soft">
                                {Math.round((det.areaRatio || 0) * 100)}%
                              </td>
                              <td className="px-5 py-3">
                                <span className="flex items-center gap-2">
                                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                                    <span
                                      className="block h-full rounded-full"
                                      style={{ width: `${det.severity}%`, backgroundColor: detStyle.hex }}
                                    />
                                  </span>
                                  <span className="font-mono font-semibold" style={{ color: detStyle.hex }}>
                                    {det.severity}
                                  </span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {report.description && (
                <div className="card p-5">
                  <h2 className="font-display text-base font-bold text-ink">Reporter's note</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{report.description}</p>
                </div>
              )}

              {report.authorityNote && (
                <div className="card border-brand-200 bg-brand-50 p-5">
                  <h2 className="font-display text-base font-bold text-brand-900">Authority note</h2>
                  <p className="mt-2 text-sm leading-relaxed text-brand-900/80">{report.authorityNote}</p>
                </div>
              )}
            </div>

            {/* side rail */}
            <div className="space-y-4">
              <div className="card p-5">
                <SeverityMeter
                  score={report.overallSeverity}
                  label={report.severityLabel}
                  confidence={report.detections?.[0]?.confidence ?? null}
                />
              </div>

              <div className="card p-5">
                <h2 className="font-display text-base font-bold text-ink">Location</h2>
                <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <span>
                    {report.locationName || 'Unnamed road'}
                    {report.district && <span className="text-ink-muted"> · {report.district}</span>}
                    <span className="mt-0.5 block font-mono text-xs text-ink-muted">
                      {formatCoords(report.latitude, report.longitude)}
                    </span>
                  </span>
                </p>
                <div className="mt-4">
                  <RoadHazardMap
                    markers={[
                      {
                        id: report._id || report.id,
                        latitude: report.latitude,
                        longitude: report.longitude,
                        hazard: report.primaryHazard,
                        severityLabel: report.severityLabel,
                        severityScore: report.overallSeverity,
                        locationName: report.locationName,
                        district: report.district,
                        resolutionStatus: report.resolutionStatus,
                        createdAt: report.createdAt,
                      },
                    ]}
                    height="200px"
                    focus={[report.latitude, report.longitude]}
                    fitToMarkers={false}
                    scrollWheelZoom={false}
                    showSeverityRadius={false}
                    showDetails={false}
                    showLegend={false}
                    showControls={false}
                    initialStyle="light"
                  />
                </div>
              </div>

              <div className="card p-5">
                <h2 className="font-display text-base font-bold text-ink">Analysis metadata</h2>
                <dl className="mt-3 space-y-2.5 text-sm">
                  {[
                    ['Reported', formatDate(report.createdAt, true), Calendar],
                    ['Analysed', formatDate(report.processedAt, true), Cpu],
                    ['Processing time', formatDuration(report.processingTimeMs), Clock],
                    ['Reported by', report.reporterName || 'Anonymous citizen', null],
                  ].map(([label, value, Icon]) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-ink-muted">
                        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                        {label}
                      </dt>
                      <dd className="text-right font-medium text-ink-soft">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
