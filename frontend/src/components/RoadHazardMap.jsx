import { useCallback, useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, CheckCircle2, CircleDot, Construction, Crosshair, Layers, Maximize2, Milestone,
  Navigation, ScanLine, Trash2, Waves, X,
} from 'lucide-react';
import { BD_CENTER, BD_DEFAULT_ZOOM, BD_LEAFLET_BOUNDS, BD_MIN_ZOOM } from '../utils/bangladesh';
import { severityStyle, hazardName, SEVERITY_LEVELS } from '../utils/severity';
import { formatCoords } from '../utils/format';
import { useLang } from '../i18n';
import BangladeshMask from './BangladeshMask';

/**
 * The national hazard map.
 *
 * - Three free base maps (no API key): CARTO dark, CARTO Voyager, Esri imagery.
 * - Teardrop pins coloured by severity, with the hazard's icon inside. They
 *   drop in one after another, critical ones keep pulsing, resolved ones fade.
 * - Clicking a pin flies the camera to it and opens a detail panel with the
 *   annotated photo, the score and quick actions.
 * The viewport stays locked to Bangladesh, the platform's coverage area.
 */

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTR = 'Tiles &copy; <a href="https://www.esri.com">Esri</a>';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const BASEMAPS = {
  dark: {
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: `${ESRI_ATTR} &middot; ${OSM_ATTR}`,
    maxNativeZoom: 16,
    bg: '#242424',
  },
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTR,
    maxNativeZoom: 19,
    bg: '#eef2f0',
  },
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution: `${ESRI_ATTR}, Maxar, Earthstar Geographics`,
    maxNativeZoom: 18,
    bg: '#1b2320',
  },
};

const HAZARD_ICON_COMPONENTS = {
  pothole: CircleDot,
  road_crack: ScanLine,
  broken_road: Construction,
  open_manhole: Milestone,
  waterlogging: Waves,
  debris: Trash2,
};
// Rendered once: divIcons need plain HTML strings.
const HAZARD_ICON_SVG = Object.fromEntries(
  Object.entries(HAZARD_ICON_COMPONENTS).map(([k, Icon]) => [
    k,
    renderToStaticMarkup(<Icon width={14} height={14} strokeWidth={2.6} />),
  ])
);

const iconCache = new Map();

function pinIcon({ hex, hazard, label, resolved, selected, delay, settled }) {
  const cacheKey = [hex, hazard, label, resolved, selected, settled ? 's' : delay].join('|');
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);
  const urgent = !resolved && (label === 'CRITICAL' || label === 'HIGH');
  const classes = ['dm-pin', urgent && 'dm-pin--urgent', label === 'CRITICAL' && !resolved && 'dm-pin--critical', resolved && 'is-resolved', selected && 'is-selected', settled && 'dm-static']
    .filter(Boolean)
    .join(' ');
  const icon = L.divIcon({
    className: 'dm-icon-host',
    html: `<div class="${classes}" style="--c:${hex};--d:${delay}ms">
      <div class="dm-drop">
        ${urgent ? '<span class="dm-pulse"></span><span class="dm-pulse dm-pulse--late"></span>' : ''}
        <span class="dm-shadow"></span>
        <div class="dm-bob">
          <svg class="dm-shape" viewBox="0 0 40 52" aria-hidden="true">
            <defs><linearGradient id="g${hex.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
            <path d="M20 50C20 50 3.5 31 3.5 19a16.5 16.5 0 1 1 33 0C36.5 31 20 50 20 50Z" fill="${hex}" stroke="#fff" stroke-width="3"/>
            <path d="M20 50C20 50 3.5 31 3.5 19a16.5 16.5 0 1 1 33 0C36.5 31 20 50 20 50Z" fill="url(#g${hex.slice(1)})"/>
          </svg>
          <span class="dm-glyph">${HAZARD_ICON_SVG[hazard] || ''}</span>
          ${resolved ? '<span class="dm-check">✓</span>' : ''}
        </div>
      </div>
    </div>`,
    iconSize: [40, 52],
    iconAnchor: [20, 50],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

/** Locks the viewport to Bangladesh, fits the markers, and flies to selections. */
function CameraController({ markers, focus, fitToMarkers, selected, panelOpen, fitSignal }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(BD_LEAFLET_BOUNDS);
    map.setMinZoom(BD_MIN_ZOOM);
  }, [map]);

  const fitAll = useCallback(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
    map.flyToBounds(bounds.pad(0.15), { maxZoom: 13, duration: 1.1 });
  }, [map, markers]);

  useEffect(() => {
    if (focus?.length === 2) {
      map.flyTo(focus, Math.max(map.getZoom(), 12), { duration: 1 });
      return;
    }
    if (fitToMarkers) fitAll();
  }, [map, focus, fitToMarkers, fitAll]);

  useEffect(() => {
    if (fitSignal) fitAll();
  }, [fitSignal, fitAll]);

  // Fly to the selected pin, nudged left so the detail panel doesn't cover it.
  useEffect(() => {
    if (!selected) return;
    const zoom = Math.max(map.getZoom(), 16);
    const target = L.latLng(selected.latitude, selected.longitude);
    const wide = map.getSize().x > 700;
    const offsetX = panelOpen && wide ? 180 : 0;
    const offsetY = panelOpen && !wide ? map.getSize().y * 0.22 : 0;
    const point = map.project(target, zoom).add([offsetX, offsetY]);
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 1.3, easeLinearity: 0.2 });
  }, [map, selected, panelOpen]);

  return null;
}

function DetailPanel({ marker, onClose, onShowAll }) {
  const { t, num, hazard, lang } = useLang();
  const label = marker.severityLabel || 'LOW';
  const style = severityStyle(label);
  const score = marker.severityScore ?? marker.overallSeverity ?? 0;
  const resolved = marker.resolutionStatus === 'resolved';
  const type = marker.hazard || marker.primaryHazard;
  const name = !type || type === 'none' ? t('map.noHazard') : hazard(type, { name: hazardName(type) }).name;
  const Icon = HAZARD_ICON_COMPONENTS[type] || CircleDot;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      key={marker.id}
      className="dm-panel absolute inset-x-2 bottom-2 z-[800] max-h-[62%] overflow-y-auto rounded-2xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[340px]"
      aria-label={name}
    >
      <div className="relative">
        {marker.thumbnail ? (
          <img src={marker.thumbnail} alt="" className="h-44 w-full object-cover" />
        ) : (
          <div className="grid h-28 place-items-center" style={{ background: `${style.hex}22` }}>
            <Icon className="h-10 w-10" style={{ color: style.hex }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
          aria-label={t('map.close')}
        >
          <X className="h-4 w-4" />
        </button>
        <span
          className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-lg"
          style={{ background: style.hex }}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          {t(`sev.${label}`)}
        </span>
        {resolved && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-bold text-white">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('map.resolved')}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow" style={{ background: style.hex }}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-bold text-ink">{name}</h3>
            <p className="truncate text-sm text-ink-muted">
              {marker.locationName || t('map.unnamed')}
              {marker.district ? ` · ${marker.district}` : ''}
            </p>
          </div>
        </div>

        {/* score bar */}
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <span className="text-xs font-medium text-ink-muted">{t('vid.severity')}</span>
            <span className="font-display text-2xl font-bold" style={{ color: style.hex }}>
              {num(score)}
              <span className="text-xs font-medium text-ink-muted">/{num(100)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gradient-to-r from-[#16a34a] via-[#f59e0b] to-[#dc2626] opacity-25" />
          <div className="relative -mt-2.5 h-2.5">
            <div className="dm-bar h-full rounded-full" style={{ width: `${score}%`, background: style.hex }} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {Number.isFinite(marker.confidence) && (
            <div className="rounded-xl bg-canvas p-2.5">
              <dt className="text-xs text-ink-muted">{t('map.confidence')}</dt>
              <dd className="font-semibold text-ink">{num(Math.round(marker.confidence * 100))}%</dd>
            </div>
          )}
          <div className="rounded-xl bg-canvas p-2.5">
            <dt className="text-xs text-ink-muted">{t('map.reported')}</dt>
            <dd className="font-semibold text-ink">
              {marker.createdAt
                ? new Date(marker.createdAt).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </dd>
          </div>
          <div className="col-span-2 rounded-xl bg-canvas p-2.5">
            <dt className="text-xs text-ink-muted">{t('map.coords')}</dt>
            <dd className="font-mono text-xs font-semibold text-ink">{formatCoords(marker.latitude, marker.longitude)}</dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {marker.id && (
            <Link to={`/report/${marker.id}`} className="btn-primary col-span-2 py-2.5">
              {t('map.viewReport')}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary py-2"
          >
            <Navigation className="h-4 w-4" />
            {t('map.directions')}
          </a>
          <button type="button" onClick={onShowAll} className="btn-secondary py-2">
            <Maximize2 className="h-4 w-4" />
            {t('map.showAll')}
          </button>
        </div>
      </div>
    </aside>
  );
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
  showDetails = true,
  showLegend = true,
  showControls = true,
  initialStyle = 'light',
  className = '',
}) {
  const { t } = useLang();
  const [basemap, setBasemap] = useState(initialStyle);
  const [selected, setSelected] = useState(null);
  const [fitSignal, setFitSignal] = useState(0);
  // Pins drop in when a marker set first appears; after that they stay put so
  // selecting one does not replay the animation on every pin.
  const [settled, setSettled] = useState(false);

  const valid = useMemo(
    () => markers.filter((m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude)),
    [markers]
  );

  useEffect(() => {
    setSettled(false);
    const id = setTimeout(() => setSettled(true), Math.min(valid.length * 35, 1400) + 900);
    return () => clearTimeout(id);
  }, [valid]);

  // Clear a selection that no longer matches the filters.
  useEffect(() => {
    if (selected && !valid.some((m) => m.id === selected.id)) setSelected(null);
  }, [valid, selected]);

  const closePanel = useCallback(() => setSelected(null), []);
  const showAll = useCallback(() => {
    setSelected(null);
    setFitSignal((n) => n + 1);
  }, []);

  const base = BASEMAPS[basemap];

  return (
    <div
      className={`dm-map relative overflow-hidden rounded-2xl border border-ink-line shadow-lift ${basemap === 'dark' ? 'dm-map--dark' : ''} ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={BD_MIN_ZOOM}
        maxBounds={BD_LEAFLET_BOUNDS}
        maxBoundsViscosity={0.9}
        scrollWheelZoom={scrollWheelZoom}
        zoomSnap={0.25}
        zoomDelta={0.5}
        zoomControl
        style={{ height: '100%', width: '100%', background: base.bg }}
      >
        <TileLayer key={basemap} url={base.url} attribution={base.attribution} maxZoom={19} maxNativeZoom={base.maxNativeZoom} />
        {base.labels && <TileLayer key={`${basemap}-labels`} url={base.labels} maxZoom={19} maxNativeZoom={16} zIndex={5} />}
        <BangladeshMask basemap={basemap} />

        <CameraController
          markers={valid}
          focus={focus}
          fitToMarkers={fitToMarkers}
          selected={selected}
          panelOpen={showDetails && Boolean(selected)}
          fitSignal={fitSignal}
        />

        {valid.map((marker, index) => {
          const label = marker.severityLabel || 'LOW';
          const style = severityStyle(label);
          const resolved = marker.resolutionStatus === 'resolved';
          const score = marker.severityScore ?? marker.overallSeverity ?? 0;
          const isSelected = selected?.id === marker.id;
          const key = marker.id || `${marker.latitude}-${marker.longitude}`;

          return (
            <div key={key}>
              {showSeverityRadius && !resolved && (
                <Circle
                  center={[marker.latitude, marker.longitude]}
                  radius={35 + score * 2}
                  pathOptions={{
                    color: style.hex,
                    fillColor: style.hex,
                    fillOpacity: isSelected ? 0.28 : basemap === 'dark' ? 0.16 : 0.1,
                    weight: isSelected ? 2 : 1,
                    className: isSelected ? 'dm-radius dm-radius--selected' : 'dm-radius',
                  }}
                />
              )}
              <Marker
                position={[marker.latitude, marker.longitude]}
                icon={pinIcon({
                  hex: style.hex,
                  hazard: marker.hazard || marker.primaryHazard,
                  label,
                  resolved,
                  selected: isSelected,
                  delay: Math.min(index * 35, 1400),
                  settled,
                })}
                zIndexOffset={isSelected ? 2000 : label === 'CRITICAL' ? 500 : 0}
                alt={`${hazardName(marker.hazard || marker.primaryHazard)} ${label}`}
                eventHandlers={{ click: () => setSelected(marker) }}
                keyboard
              />
            </div>
          );
        })}
      </MapContainer>

      {/* base map switcher */}
      {showControls && (
      <div className="absolute bottom-6 left-2 z-[800] flex gap-1 rounded-xl border border-white/20 bg-white/90 p-1 shadow-lg backdrop-blur-md sm:bottom-auto sm:left-3 sm:top-[86px] sm:flex-col">
        {[
          ['light', 'map.style.light'],
          ['dark', 'map.style.dark'],
          ['satellite', 'map.style.satellite'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBasemap(key)}
            className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
              basemap === key ? 'bg-brand-gradient text-white shadow' : 'text-ink-soft hover:bg-black/5'
            }`}
            aria-pressed={basemap === key}
          >
            {key === 'light' && <Layers className="mr-1 inline h-3.5 w-3.5" />}
            {t(label)}
          </button>
        ))}
        <button
          type="button"
          onClick={showAll}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-black/5 sm:mt-0.5 sm:border-t sm:border-black/5"
          title={t('map.showAll')}
        >
          <Crosshair className="h-3.5 w-3.5" />
          {t('map.fit')}
        </button>
      </div>
      )}

      {/* legend */}
      {showLegend && (
        <div className="absolute bottom-7 left-3 z-[800] hidden rounded-xl border border-white/20 bg-white/85 px-3 py-2 shadow-lg backdrop-blur-md sm:block">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t('map.legend')}</p>
          <ul className="space-y-1">
            {[...SEVERITY_LEVELS].reverse().map((level) => (
              <li key={level} className="flex items-center gap-2 text-xs text-ink-soft">
                <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: severityStyle(level).hex }} />
                {t(`sev.${level}`)}
              </li>
            ))}
            <li className="flex items-center gap-2 text-xs text-ink-soft">
              <span className="grid h-2.5 w-2.5 place-items-center rounded-full bg-green-600 text-[7px] text-white">✓</span>
              {t('map.resolved')}
            </li>
          </ul>
        </div>
      )}

      {/* hint */}
      {showDetails && !selected && valid.length > 1 && (
        <p className="pointer-events-none absolute right-3 top-3 z-[800] hidden rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur sm:block">
          {t('map.hint')}
        </p>
      )}

      {showDetails && selected && <DetailPanel marker={selected} onClose={closePanel} onShowAll={showAll} />}
    </div>
  );
}
