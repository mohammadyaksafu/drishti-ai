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

const pinIcon = L.divIcon({
  className: 'drishti-marker',
  html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#4c1d95;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
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
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  const position = value?.latitude && value?.longitude ? [value.latitude, value.longitude] : null;

  const set = (lat, lng, source) => {
    onChange({ latitude: lat, longitude: lng, district: nearestDivision(lat, lng) });
    setMessage(source === 'gps' ? 'Location captured from your device GPS.' : '');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage('This browser cannot share a location. Tap the map instead.');
      return;
    }
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!isInsideBangladesh(coords.latitude, coords.longitude)) {
          setMessage('You appear to be outside Bangladesh. DRISHTI AI covers Bangladeshi roads only — pick the spot on the map.');
          return;
        }
        set(coords.latitude, coords.longitude, 'gps');
      },
      (err) => {
        setLocating(false);
        const reasons = {
          1: 'Location permission was declined. Tap the map to place the hazard instead.',
          2: 'Your location is unavailable right now. Tap the map instead.',
          3: 'Finding your location took too long. Tap the map instead.',
        };
        setMessage(reasons[err.code] || 'Could not read your location. Tap the map instead.');
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
          {locating ? 'Finding you…' : 'Use my location'}
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
          <option value="">Jump to division…</option>
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
            'No location set yet — use GPS or tap the map'
          )}
        </span>
        {position && (
          <button type="button" className="btn-ghost text-xs" onClick={() => onChange({})} disabled={disabled}>
            Clear
          </button>
        )}
      </div>

      {message && <p className="text-sm text-ink-soft">{message}</p>}
    </div>
  );
}
