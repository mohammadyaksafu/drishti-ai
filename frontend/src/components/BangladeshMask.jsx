import { Polygon } from 'react-leaflet';
import { BD_OUTLINE } from '../utils/bangladeshOutline';

// A frame well beyond anything the locked viewport can show.
const OUTER = [
  [5, 70],
  [5, 110],
  [40, 110],
  [40, 70],
];

const SHADE = {
  light: { color: '#eef3f0', opacity: 0.93 },
  dark: { color: '#0b0f0d', opacity: 0.86 },
  satellite: { color: '#04120e', opacity: 0.78 },
};

/**
 * Greys out everything outside Bangladesh and traces the national border, so
 * the map reads as a map of Bangladesh rather than of the region.
 * Non-interactive: clicks pass straight through to the map and the pins.
 */
export default function BangladeshMask({ basemap = 'light' }) {
  const shade = SHADE[basemap] || SHADE.light;
  return (
    <>
      <Polygon
        positions={[OUTER, ...BD_OUTLINE]}
        interactive={false}
        pathOptions={{ stroke: false, fillColor: shade.color, fillOpacity: shade.opacity }}
      />
      {/* soft glow, then the crisp border on top */}
      <Polygon
        positions={BD_OUTLINE}
        interactive={false}
        pathOptions={{ color: '#1ba06d', weight: 7, opacity: 0.18, fill: false }}
      />
      <Polygon
        positions={BD_OUTLINE}
        interactive={false}
        pathOptions={{ color: '#006a4e', weight: 2.2, opacity: 0.9, fill: false }}
      />
    </>
  );
}
