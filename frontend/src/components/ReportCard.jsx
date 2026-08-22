import { Link } from 'react-router-dom';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { SeverityBadge, StatusBadge, ResolutionBadge } from './StatusBadge';
import { hazardName, severityStyle } from '../utils/severity';
import { formatCoords, timeAgo } from '../utils/format';

export default function ReportCard({ report }) {
  const style = severityStyle(report.severityLabel);
  const image = report.annotatedImageUrl || report.imageUrl;
  const analysed = report.status === 'completed';

  return (
    <article className="card group overflow-hidden transition-shadow hover:shadow-lift">
      <Link to={`/report/${report._id || report.id}`} className="block">
        <div className="relative h-44 overflow-hidden bg-zinc-100">
          {image ? (
            <img
              src={image}
              alt={`Road hazard reported at ${report.locationName || 'an unnamed location'}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-ink-muted">No image</div>
          )}

          {analysed && (
            <span
              className="absolute left-0 top-0 h-full w-1.5"
              style={{ backgroundColor: style.hex }}
              aria-hidden="true"
            />
          )}
          <div className="absolute right-3 top-3">
            {analysed ? (
              <SeverityBadge label={report.severityLabel} score={report.overallSeverity} />
            ) : (
              <StatusBadge status={report.status} />
            )}
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink">
            {analysed ? hazardName(report.primaryHazard) : 'Awaiting analysis'}
          </h3>
          <ResolutionBadge status={report.resolutionStatus} />
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {report.locationName || report.district || formatCoords(report.latitude, report.longitude)}
          </span>
        </p>

        {report.description && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{report.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-ink-line pt-3">
          <span className="font-mono text-xs text-ink-muted">{timeAgo(report.createdAt)}</span>
          <Link
            to={`/report/${report._id || report.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:text-brand-600"
          >
            Open
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
