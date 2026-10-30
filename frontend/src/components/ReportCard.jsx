import { Link } from 'react-router-dom';
import { MapPin, ArrowUpRight, ImageOff } from 'lucide-react';
import { SeverityBadge, StatusBadge, ResolutionBadge } from './StatusBadge';
import { hazardName, severityStyle } from '../utils/severity';
import { formatCoords, timeAgo } from '../utils/format';

export default function ReportCard({ report }) {
  const style = severityStyle(report.severityLabel);
  const image = report.annotatedImageUrl || report.imageUrl;
  const analysed = report.status === 'completed';
  const href = `/report/${report._id || report.id}`;

  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden">
      <div className="relative h-48 overflow-hidden bg-canvas">
        {image ? (
          <img
            src={image}
            alt={`Road hazard reported at ${report.locationName || 'an unnamed location'}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted">
            <ImageOff className="h-6 w-6" aria-label="No image" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-night-950/60 via-transparent to-transparent" aria-hidden="true" />

        {analysed && (
          <span
            className="absolute inset-x-0 bottom-0 h-1"
            style={{ backgroundColor: style.hex }}
            aria-hidden="true"
          />
        )}
        <div className="absolute left-3 top-3">
          {analysed ? (
            <SeverityBadge label={report.severityLabel} score={report.overallSeverity} className="shadow-sm" />
          ) : (
            <StatusBadge status={report.status} className="shadow-sm" />
          )}
        </div>
        <span className="absolute bottom-3 right-3 rounded-md bg-night-950/60 px-2 py-0.5 font-mono text-[11px] text-white/90 backdrop-blur">
          {timeAgo(report.createdAt)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink">
            {/* The stretched link makes the whole card one target without nesting links. */}
            <Link to={href} className="after:absolute after:inset-0 focus-visible:outline-none">
              {analysed ? hazardName(report.primaryHazard) : 'Awaiting analysis'}
            </Link>
          </h3>
          <ResolutionBadge status={report.resolutionStatus} />
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="truncate">
            {report.locationName || report.district || formatCoords(report.latitude, report.longitude)}
          </span>
        </p>

        {report.description && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{report.description}</p>}

        <div className="mt-auto flex items-center justify-end pt-4">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-colors group-hover:text-brand-600">
            View analysis
            <ArrowUpRight
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </article>
  );
}
