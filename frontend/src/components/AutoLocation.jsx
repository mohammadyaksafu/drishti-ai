import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Camera, CheckCircle2, Crosshair, Loader2, RefreshCw } from 'lucide-react';
import BangladeshMask from './BangladeshMask';
import { isInsideBangladesh, nearestDivision } from '../utils/bangladesh';
import { readExifGps } from '../utils/exifGps';
import { formatCoords } from '../utils/format';
import { useLang } from '../i18n';

const pin = L.divIcon({
  className: 'dm-icon-host',
  html: `<div class="dm-pin dm-pin--critical" style="--c:#f42a41;--d:0ms"><div class="dm-drop">
    <span class="dm-pulse"></span><span class="dm-shadow"></span>
    <div class="dm-bob"><svg class="dm-shape" viewBox="0 0 40 52"><path d="M20 50C20 50 3.5 31 3.5 19a16.5 16.5 0 1 1 33 0C36.5 31 20 50 20 50Z" fill="#f42a41" stroke="#fff" stroke-width="3"/></svg>
    <span class="dm-glyph" style="width:12px;height:12px;margin-left:-6px;top:13px"></span></div></div></div>`,
  iconSize: [40, 52],
  iconAnchor: [20, 50],
});

/**
 * Location is captured automatically — there is no manual picker.
 *  1. If the photo carries GPS in its EXIF data, that is used: it is where the
 *     picture was taken, i.e. where the hazard is.
 *  2. Otherwise the device's GPS is read (requested as soon as the page opens).
 * Anything outside Bangladesh is refused.
 */
export default function AutoLocation({ file, value, onChange, disabled = false }) {
  const { t, num } = useLang();
  const [status, setStatus] = useState('idle'); // idle | locating | ready | error
  const [message, setMessage] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const deviceFix = useRef(null);

  const accept = useCallback(
    (lat, lng, source, acc = null) => {
      if (!isInsideBangladesh(lat, lng)) {
        setStatus('error');
        setMessage(t('loc.outside'));
        onChange({});
        return false;
      }
      setAccuracy(acc);
      setStatus('ready');
      setMessage('');
      onChange({ latitude: lat, longitude: lng, district: nearestDivision(lat, lng), source });
      return true;
    },
    [onChange, t]
  );

  const locateDevice = useCallback(() => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setStatus('error');
      setMessage(window.isSecureContext ? t('loc.noGeo') : t('loc.insecure'));
      return;
    }
    setStatus('locating');
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        deviceFix.current = coords;
        accept(coords.latitude, coords.longitude, 'gps', coords.accuracy);
      },
      (err) => {
        const reasons = { 1: t('loc.denied'), 2: t('loc.unavailable'), 3: t('loc.timeout') };
        setStatus('error');
        setMessage(reasons[err.code] || t('loc.failed'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [accept, t]);

  // Ask for the device position as soon as the reporter opens the page.
  useEffect(() => {
    locateDevice();
  }, [locateDevice]);

  // A photo with GPS overrides the device position.
  useEffect(() => {
    let cancelled = false;
    if (!file) return undefined;
    readExifGps(file).then((gps) => {
      if (cancelled) return;
      if (gps) accept(gps.latitude, gps.longitude, 'photo');
      else if (value?.source === 'photo') {
        // New photo without GPS: fall back to the device fix.
        if (deviceFix.current) accept(deviceFix.current.latitude, deviceFix.current.longitude, 'gps', deviceFix.current.accuracy);
        else locateDevice();
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const ready = status === 'ready' && value?.latitude;
  const position = ready ? [value.latitude, value.longitude] : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-line">
      <div className="flex flex-wrap items-center gap-3 bg-canvas px-4 py-3">
        {status === 'locating' && (
          <>
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-700">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400/40" />
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
            <span className="text-sm font-semibold text-ink">{t('loc.auto.finding')}</span>
          </>
        )}
        {ready && (
          <>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                {value.source === 'photo' ? t('loc.auto.fromPhoto') : t('loc.auto.fromGps')}
                {value.district ? ` · ${t(`div.${value.district}`)}` : ''}
              </span>
              <span className="block font-mono text-xs text-ink-muted">
                {formatCoords(value.latitude, value.longitude)}
                {accuracy ? ` · ±${num(Math.round(accuracy))} m` : ''}
              </span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-ink-line">
              {value.source === 'photo' ? <Camera className="h-3.5 w-3.5" /> : <Crosshair className="h-3.5 w-3.5" />}
              {t('loc.auto.locked')}
            </span>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-sm text-red-800">{message}</span>
            <button type="button" onClick={locateDevice} disabled={disabled} className="btn-secondary py-2 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('loc.auto.retry')}
            </button>
          </>
        )}
      </div>

      {/* Read-only preview: the reporter sees where it landed but cannot move it. */}
      <div className="relative h-56 bg-[#eef2f0]">
        {position ? (
          <MapContainer
            key={position.join(',')}
            center={position}
            zoom={16}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <BangladeshMask basemap="light" />
            {accuracy && <Circle center={position} radius={accuracy} pathOptions={{ color: '#006a4e', weight: 1, fillOpacity: 0.08 }} />}
            <Marker position={position} icon={pin} interactive={false} />
          </MapContainer>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div className="text-sm text-ink-muted">
              <Crosshair className={`mx-auto mb-2 h-8 w-8 text-brand-400 ${status === 'locating' ? 'animate-pulse' : ''}`} />
              {status === 'locating' ? t('loc.auto.wait') : t('loc.auto.none')}
            </div>
          </div>
        )}
      </div>
      <p className="border-t border-ink-line bg-white px-4 py-2.5 text-xs text-ink-muted">{t('loc.auto.note')}</p>
    </div>
  );
}
