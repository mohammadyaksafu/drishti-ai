import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
import {
  BD_CENTER,
  BD_LEAFLET_BOUNDS,
  BD_MIN_ZOOM,
  DIVISIONS,
  isInsideBangladesh,
  nearestDivision,
} from '../utils/bangladesh';
import { formatCoords } from '../utils/format';
import { useLang } from '../i18n';
import BangladeshMask from './BangladeshMask';

const pinIcon = L.divIcon({
  className: 'drishti-marker',
  html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#006a4e;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function ClickCapture({ onPick }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      if (isInsideBangladesh(lat, lng)) onPick(lat, lng);
    },
  });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.7 });
  }, [map, position]);
  return null;
}

/**
 * Location capture for a report: GPS first, tap-the-map as the fallback.
 * Everything is constrained to Bangladesh, which is the platform's coverage area.
 */
export default function LocationPicker({ value, onChange, disabled = false }) {
  const { t } = useLang();
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  const position = value?.latitude && value?.longitude ? [value.latitude, value.longitude] : null;

  const set = (lat, lng, source) => {
    onChange({ latitude: lat, longitude: lng, district: nearestDivision(lat, lng) });
    setMessage(source === 'gps' ? t('loc.gps') : '');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage(t('loc.noGeo'));
      return;
    }
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!isInsideBangladesh(coords.latitude, coords.longitude)) {
          setMessage(t('loc.outside'));
          return;
        }
        set(coords.latitude, coords.longitude, 'gps');
      },
      (err) => {
        setLocating(false);
        const reasons = {
          1: t('loc.denied'),
          2: t('loc.unavailable'),
          3: t('loc.timeout'),
        };
        setMessage(reasons[err.code] || t('loc.failed'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={disabled || locating}
          className="btn-primary"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="h-4 w-4" aria-hidden="true" />
          )}
          {locating ? t('loc.finding') : t('loc.use')}
        </button>

        <label className="sr-only" htmlFor="division-jump">
          Jump to a division
        </label>
        <select
          id="division-jump"
          className="field w-auto"
          defaultValue=""
          disabled={disabled}
          onChange={(e) => {
            const division = DIVISIONS.find((d) => d.name === e.target.value);
            if (division) set(division.lat, division.lng, 'division');
          }}
        >
          <option value="">{t('loc.jump')}</option>
          {DIVISIONS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-line" style={{ height: 300 }}>
        <MapContainer
          center={position || BD_CENTER}
          zoom={position ? 15 : 7}
          minZoom={BD_MIN_ZOOM}
          maxBounds={BD_LEAFLET_BOUNDS}
          maxBoundsViscosity={0.9}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <BangladeshMask basemap="light" />
          <ClickCapture onPick={(lat, lng) => set(lat, lng, 'map')} />
          <Recenter position={position} />
          {position && <Marker position={position} icon={pinIcon} />}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-line bg-zinc-50 px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
          {position ? (
            <>
              <span className="font-mono">{formatCoords(value.latitude, value.longitude)}</span>
              {value.district && <span className="text-ink-muted">· {value.district}</span>}
            </>
          ) : (
            t('loc.none')
          )}
        </span>
        {position && (
          <button type="button" className="btn-ghost text-xs" onClick={() => onChange({})} disabled={disabled}>
            {t('loc.clear')}
          </button>
        )}
      </div>

      {message && <p className="text-sm text-ink-soft">{message}</p>}
    </div>
  );
}
