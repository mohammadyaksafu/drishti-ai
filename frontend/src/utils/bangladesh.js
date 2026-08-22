/**
 * DRISHTI AI covers Bangladesh only. The map never leaves these bounds and
 * submissions outside them are rejected before an ML job is created.
 */
export const BD_BOUNDS = {
  minLat: 20.5,
  maxLat: 26.7,
  minLng: 88.0,
  maxLng: 92.7,
};

// Leaflet expects [[south, west], [north, east]].
export const BD_LEAFLET_BOUNDS = [
  [BD_BOUNDS.minLat, BD_BOUNDS.minLng],
  [BD_BOUNDS.maxLat, BD_BOUNDS.maxLng],
];

export const BD_CENTER = [23.685, 90.3563];
export const BD_DEFAULT_ZOOM = 7;
export const BD_MIN_ZOOM = 6;

export const isInsideBangladesh = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= BD_BOUNDS.minLat &&
  lat <= BD_BOUNDS.maxLat &&
  lng >= BD_BOUNDS.minLng &&
  lng <= BD_BOUNDS.maxLng;

/** Division centroids, used to jump the map and to pre-fill the district field. */
export const DIVISIONS = [
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125 },
  { name: 'Chattogram', lat: 22.3569, lng: 91.7832 },
  { name: 'Sylhet', lat: 24.8949, lng: 91.8687 },
  { name: 'Rajshahi', lat: 24.3745, lng: 88.6042 },
  { name: 'Khulna', lat: 22.8456, lng: 89.5403 },
  { name: 'Barishal', lat: 22.701, lng: 90.3535 },
  { name: 'Rangpur', lat: 25.7439, lng: 89.2752 },
  { name: 'Mymensingh', lat: 24.7471, lng: 90.4203 },
];

/** Nearest division to a point — a cheap offline stand-in for reverse geocoding. */
export function nearestDivision(lat, lng) {
  let best = DIVISIONS[0];
  let bestDistance = Infinity;
  for (const division of DIVISIONS) {
    const d = (division.lat - lat) ** 2 + (division.lng - lng) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = division;
    }
  }
  return best.name;
}
