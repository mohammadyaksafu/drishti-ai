/**
 * One source of truth for severity presentation. Every badge, marker, chart
 * slice and meter in the app reads its colour and label from here, so a
 * CRITICAL hazard looks identical wherever it appears.
 */
export const SEVERITY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

export const SEVERITY_STYLES = {
  LOW: {
    label: 'Low',
    hex: '#16a34a',
    text: 'text-sev-low',
    bg: 'bg-green-50',
    border: 'border-green-200',
    chip: 'bg-green-50 text-green-800 border-green-200',
    bar: 'bg-sev-low',
    blurb: 'Monitor during routine inspection.',
  },
  MODERATE: {
    label: 'Moderate',
    hex: '#f59e0b',
    text: 'text-sev-moderate',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    chip: 'bg-amber-50 text-amber-900 border-amber-200',
    bar: 'bg-sev-moderate',
    blurb: 'Schedule repair in the next maintenance cycle.',
  },
  HIGH: {
    label: 'High',
    hex: '#ea580c',
    text: 'text-sev-high',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    chip: 'bg-orange-50 text-orange-900 border-orange-200',
    bar: 'bg-sev-high',
    blurb: 'Repair soon — this affects everyday traffic safety.',
  },
  CRITICAL: {
    label: 'Critical',
    hex: '#dc2626',
    text: 'text-sev-critical',
    bg: 'bg-red-50',
    border: 'border-red-200',
    chip: 'bg-red-50 text-red-800 border-red-200',
    bar: 'bg-sev-critical',
    blurb: 'Act immediately — high risk of injury or vehicle damage.',
  },
};

export const severityStyle = (label) => SEVERITY_STYLES[label] || SEVERITY_STYLES.LOW;

export const labelForScore = (score) => {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
};

export const HAZARD_TYPES = [
  'pothole',
  'road_crack',
  'broken_road',
  'open_manhole',
  'waterlogging',
  'debris',
];

export const HAZARD_META = {
  pothole: {
    name: 'Pothole',
    description: 'Surface cavities that damage suspensions and throw two-wheelers off balance.',
  },
  road_crack: {
    name: 'Road crack',
    description: 'Early-stage fatigue cracking — cheap to fix now, expensive to ignore.',
  },
  broken_road: {
    name: 'Broken road',
    description: 'Failed carriageway sections where the surface has given way entirely.',
  },
  open_manhole: {
    name: 'Open manhole',
    description: 'Uncovered drainage access. The highest-risk class in the model.',
  },
  waterlogging: {
    name: 'Waterlogging',
    description: 'Standing water that hides whatever damage sits underneath it.',
  },
  debris: {
    name: 'Debris',
    description: 'Construction spill, rubble or obstruction blocking a lane.',
  },
};

export const hazardName = (type) =>
  HAZARD_META[type]?.name || String(type || 'Unknown').replace(/_/g, ' ');

export const STATUS_META = {
  pending: { label: 'Queued for AI', chip: 'bg-zinc-100 text-ink-soft border-ink-line' },
  processing: { label: 'Analysing', chip: 'bg-brand-50 text-brand-800 border-brand-200' },
  completed: { label: 'Analysed', chip: 'bg-green-50 text-green-800 border-green-200' },
  failed: { label: 'Analysis failed', chip: 'bg-red-50 text-red-800 border-red-200' },
};

export const LIFECYCLE_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'PENDING_AI', label: 'Queued' },
  { key: 'PROCESSING', label: 'Analysing' },
  { key: 'AI_COMPLETED', label: 'Analysed' },
  { key: 'PRIORITIZED', label: 'Prioritised' },
  { key: 'RESOLVED', label: 'Resolved' },
];
