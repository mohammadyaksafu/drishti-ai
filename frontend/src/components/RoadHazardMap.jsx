import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import {
  BD_CENTER,
  BD_DEFAULT_ZOOM,
  BD_LEAFLET_BOUNDS,
  BD_MIN_ZOOM,
} from '../utils/bangladesh';
import { severityStyle, hazardName } from '../utils/severity';
import { formatCoords, formatDate } from '../utils/format';

/**
 * Reusable OpenStreetMap view for DRISHTI AI.
 *
 * OpenStreetMap tiles need no API key and no billing account, which matters for
 * a public civic tool. The viewport is locked to Bangladesh: the platform only
 * covers Bangladeshi roads, so panning to Berlin would only ever show emptiness.
 */

// divIcon avoids Leaflet's broken default-marker asset paths under Vite and
// lets each marker carry its severity colour directly.
function severityIcon(label, resolved = false) {
  const { hex } = severityStyle(label);
  const ping =
    label === 'CRITICAL' && !resolved
      ? `<span class="drishti-marker__ping animate-pulse-ring" style="background:${hex}"></span>`
      : '';
  return L.divIcon({
    className: 'drishti-marker',
    html: `<span style="position:relative;display:block;width:18px;height:18px;">
             ${ping}
             <span class="drishti-marker__dot" style="background:${hex};opacity:${resolved ? 0.45 : 1}"></span>
           </span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

/** Keeps the map inside Bangladesh and re-fits when the marker set changes. */
function BoundsController({ markers, focus, fitToMarkers }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(BD_LEAFLET_BOUNDS);
    map.setMinZoom(BD_MIN_ZOOM);
  }, [map]);

  useEffect(() => {
    if (focus?.length === 2) {
      map.flyTo(focus, Math.max(map.getZoom(), 14), { duration: 0.8 });
      return;
    }
    if (fitToMarkers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
      map.fitBounds(bounds.pad(0.18), { maxZoom: 13 });
    }
  }, [map, markers, focus, fitToMarkers]);

  return null;
}

export default function RoadHazardMap({
  markers = [],
  height = '520px',
  center = BD_CENTER,
  zoom = BD_DEFAULT_ZOOM,
  focus = null,
  fitToMarkers = true,
  showSeverityRadius = true,
  scrollWheelZoom = true,
  className = '',
}) {
  const valid = useMemo(
    () => markers.filter((m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude)),
    [markers]
  );

  return (
    <div className={`overflow-hidden rounded-2xl border border-ink-line ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={BD_MIN_ZOOM}
        maxBounds={BD_LEAFLET_BOUNDS}
        maxBoundsViscosity={0.9}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <BoundsController markers={valid} focus={focus} fitToMarkers={fitToMarkers} />

        {valid.map((marker) => {
          const label = marker.severityLabel || 'LOW';
          const style = severityStyle(label);
          const resolved = marker.resolutionStatus === 'resolved';
          const score = marker.severityScore ?? marker.overallSeverity ?? 0;

          return (
            <div key={marker.id || `${marker.latitude}-${marker.longitude}`}>
              {showSeverityRadius && !resolved && (
                <Circle
                  center={[marker.latitude, marker.longitude]}
                  // Radius scales with severity so the worst spots read first at low zoom.
                  radius={60 + score * 4}
                  pathOptions={{ color: style.hex, fillColor: style.hex, fillOpacity: 0.1, weight: 1 }}
                />
              )}

              <Marker
                position={[marker.latitude, marker.longitude]}
                icon={severityIcon(label, resolved)}
                alt={`${hazardName(marker.hazard || marker.primaryHazard)} rated ${label}`}
              >
                <Popup>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-sm font-bold text-ink">
                        {hazardName(marker.hazard || marker.primaryHazard)}
                      </p>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                        style={{ backgroundColor: style.hex }}
                      >
                        {label}
                      </span>
                    </div>

                    {marker.thumbnail && (
                      <img
                        src={marker.thumbnail}
                        alt=""
                        loading="lazy"
                        className="mt-2 h-24 w-full rounded-lg object-cover"
                      />
                    )}

                    <dl className="mt-2 space-y-1 font-mono text-[11px] text-ink-soft">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-muted">Severity</dt>
                        <dd className="font-semibold">{score}/100</dd>
                      </div>
                      {Number.isFinite(marker.confidence) && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-muted">Confidence</dt>
                          <dd className="font-semibold">{Math.round(marker.confidence * 100)}%</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-muted">Location</dt>
                        <dd className="truncate font-semibold" title={marker.locationName || marker.district}>
                          {marker.locationName || marker.district || 'Unnamed road'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-muted">Coordinates</dt>
                        <dd>{formatCoords(marker.latitude, marker.longitude)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-muted">Reported</dt>
                        <dd>{formatDate(marker.createdAt)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-muted">Status</dt>
                        <dd className={resolved ? 'text-green-700' : 'text-orange-700'}>
                          {resolved ? 'Resolved' : 'Open'}
                        </dd>
                      </div>
                    </dl>

                    {marker.id && (
                      <Link
                        to={`/report/${marker.id}`}
                        className="mt-3 block rounded-lg bg-brand-gradient px-3 py-1.5 text-center text-xs font-semibold text-white hover:brightness-110"
                      >
                        View report
                      </Link>
                    )}
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
