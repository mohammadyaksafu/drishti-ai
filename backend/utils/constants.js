const HAZARD_TYPES = [
  'pothole',
  'road_crack',
  'broken_road',
  'open_manhole',
  'waterlogging',
  'debris',
];

const REPORT_STATUS = ['pending', 'processing', 'completed', 'failed'];

const LIFECYCLE = [
  'SUBMITTED',
  'PENDING_AI',
  'PROCESSING',
  'AI_COMPLETED',
  'PRIORITIZED',
  'RESOLVED',
];

const SEVERITY_LABELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

/**
 * DRISHTI AI only accepts and displays reports inside Bangladesh.
 * This is the national bounding box (a little padding included).
 */
const BANGLADESH_BOUNDS = {
  minLat: 20.5,
  maxLat: 26.7,
  minLng: 88.0,
  maxLng: 92.7,
};

const isInsideBangladesh = (lat, lng) =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= BANGLADESH_BOUNDS.minLat &&
  lat <= BANGLADESH_BOUNDS.maxLat &&
  lng >= BANGLADESH_BOUNDS.minLng &&
  lng <= BANGLADESH_BOUNDS.maxLng;

module.exports = {
  HAZARD_TYPES,
  REPORT_STATUS,
  LIFECYCLE,
  SEVERITY_LABELS,
  BANGLADESH_BOUNDS,
  isInsideBangladesh,
};
