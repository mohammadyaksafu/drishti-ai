/**
 * Demo data for presentations: ~70 analysed road-hazard reports across all
 * eight divisions of Bangladesh, from a handful of demo citizens, spread over
 * the last three months so the dashboard trends, the national map and the
 * report list all have something real-looking to show.
 *
 * Everything it creates is tagged (model version "demo-v1", emails at
 * @demo.drishti.ai) so it can be removed again without touching real reports.
 *
 *   node utils/seed-demo.js           add demo data (skips if already present)
 *   node utils/seed-demo.js --reset   remove existing demo data, then add it again
 *   node utils/seed-demo.js --remove  remove demo data only
 *
 * Images are the illustrations from utils/demo-images.js, served by the
 * frontend at /demo/*.svg.
 */
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Report = require('../models/Report');
const { BOXES } = require('./demo-images');

const MODEL_VERSION = 'demo-v1';
const EMAIL_DOMAIN = 'demo.drishti.ai';

// Fictional people. Passwords are random and never printed, so these accounts
// exist only as report authors and cannot be signed into.
const CITIZENS = [
  ['Tanvir Ahmed', 'Dhaka'],
  ['Nusrat Jahan', 'Dhaka'],
  ['Rafiqul Islam', 'Chattogram'],
  ['Sumaiya Akter', 'Sylhet'],
  ['Mahmudul Hasan', 'Rajshahi'],
  ['Farhana Rahman', 'Khulna'],
  ['Arif Hossain', 'Barishal'],
  ['Shirin Sultana', 'Rangpur'],
  ['Kamrul Hasan', 'Mymensingh'],
  ['Jannatul Ferdous', 'Sylhet'],
];

// [locationName, division, lat, lng]
const PLACES = [
  ['Farmgate Intersection', 'Dhaka', 23.7577, 90.3897],
  ['Mirpur 10 Circle', 'Dhaka', 23.8069, 90.3687],
  ['Mohakhali Flyover ramp', 'Dhaka', 23.7781, 90.4006],
  ['Jatrabari Chowrasta', 'Dhaka', 23.7104, 90.4347],
  ['Uttara Sector 7 Road', 'Dhaka', 23.8687, 90.3983],
  ['Gabtoli Bus Terminal', 'Dhaka', 23.7834, 90.3442],
  ['Tongi Station Road', 'Dhaka', 23.8915, 90.4023],
  ['Narayanganj Chashara', 'Dhaka', 23.6238, 90.5000],
  ['Gazipur Chowrasta', 'Dhaka', 23.9999, 90.4203],
  ['Savar Bus Stand', 'Dhaka', 23.8583, 90.2667],
  ['GEC Circle', 'Chattogram', 22.3590, 91.8213],
  ['Agrabad Access Road', 'Chattogram', 22.3249, 91.8070],
  ['Bahaddarhat', 'Chattogram', 22.3687, 91.8436],
  ['Cox’s Bazar Kolatoli Road', 'Chattogram', 21.4285, 92.0058],
  ['Cumilla Kandirpar', 'Chattogram', 23.4607, 91.1809],
  ['Feni Trunk Road', 'Chattogram', 23.0159, 91.3976],
  ['Zindabazar Point', 'Sylhet', 24.8949, 91.8687],
  ['Amberkhana Crossing', 'Sylhet', 24.9045, 91.8712],
  ['Tilagor Road', 'Sylhet', 24.8993, 91.8945],
  ['Sreemangal Station Road', 'Sylhet', 24.3065, 91.7296],
  ['Rajshahi Zero Point', 'Rajshahi', 24.3636, 88.6241],
  ['Shaheb Bazar Road', 'Rajshahi', 24.3667, 88.5986],
  ['Bogura Satmatha', 'Rajshahi', 24.8481, 89.3730],
  ['Natore Harispur', 'Rajshahi', 24.4206, 89.0003],
  ['Khulna Shibbari More', 'Khulna', 22.8159, 89.5521],
  ['Daulatpur Road', 'Khulna', 22.8780, 89.5170],
  ['Jashore Monihar', 'Khulna', 23.1634, 89.2182],
  ['Kushtia Majampur', 'Khulna', 23.9013, 89.1222],
  ['Barishal Sadar Road', 'Barishal', 22.7017, 90.3535],
  ['Nathullabad Bus Stand', 'Barishal', 22.6850, 90.3540],
  ['Patuakhali Launch Ghat Road', 'Barishal', 22.3596, 90.3299],
  ['Rangpur Jahaj Company More', 'Rangpur', 25.7466, 89.2517],
  ['Modern More', 'Rangpur', 25.7210, 89.2620],
  ['Dinajpur Bahadur Bazar', 'Rangpur', 25.6279, 88.6332],
  ['Mymensingh Town Hall More', 'Mymensingh', 24.7564, 90.4065],
  ['Charpara Road', 'Mymensingh', 24.7470, 90.4200],
  ['Jamalpur Station Road', 'Mymensingh', 24.9375, 89.9370],
];

// Each hazard's intrinsic risk, mirroring the severity engine's idea that an
// open manhole is worse than a hairline crack.
const HAZARD_RISK = {
  open_manhole: [72, 98],
  broken_road: [55, 90],
  pothole: [40, 92],
  waterlogging: [35, 80],
  debris: [25, 70],
  road_crack: [12, 55],
};
const HAZARD_MIX = [
  'pothole', 'pothole', 'pothole', 'pothole',
  'road_crack', 'road_crack', 'road_crack',
  'broken_road', 'broken_road',
  'waterlogging', 'waterlogging', 'waterlogging',
  'open_manhole', 'open_manhole',
  'debris', 'debris',
];

const DESCRIPTIONS = {
  pothole: [
    'বাম লেনে গভীর গর্ত, রাতে রিকশা প্রায় উল্টে যাচ্ছিল।',
    'Deep pothole right after the speed breaker, bikes swerve into traffic to avoid it.',
    'বৃষ্টির পর গর্তে পানি জমে থাকে, বোঝা যায় না কত গভীর।',
    'Several potholes in a row near the bus stop, CNGs keep getting stuck.',
  ],
  road_crack: [
    'রাস্তার মাঝখানে লম্বা ফাটল, দিন দিন বড় হচ্ছে।',
    'Long cracks across both lanes, surface is starting to lift at the edges.',
    'Cracks near the culvert, looks like the base is weakening.',
  ],
  broken_road: [
    'রাস্তার কার্পেটিং পুরো উঠে গেছে, শুধু ইট-পাথর বের হয়ে আছে।',
    'Whole section of the road has collapsed after the last flood.',
    'Broken surface for about 50 metres, buses crawl through here at rush hour.',
  ],
  open_manhole: [
    'ম্যানহোলের ঢাকনা নেই, স্কুলের বাচ্চারা এই পথে হাঁটে। খুব বিপজ্জনক।',
    'Open manhole on the footpath edge, no warning sign at all.',
    'Drain cover missing since last week, someone put a branch in it as a warning.',
  ],
  waterlogging: [
    'সামান্য বৃষ্টিতেই হাঁটু পানি জমে যায়, নিচের গর্ত দেখা যায় না।',
    'Knee-deep water after every rain, the drain is blocked with plastic.',
    'Waterlogging for three days now, rickshaws charging double to cross.',
  ],
  debris: [
    'নির্মাণকাজের ইট-বালু রাস্তার অর্ধেক দখল করে রেখেছে।',
    'Construction rubble dumped on the road, one lane completely blocked.',
    'Bricks and sand left on the road after the drain work, no one cleaned it.',
  ],
};

const AUTHORITY_NOTES = [
  'সিটি কর্পোরেশনের প্রকৌশল বিভাগ মেরামত সম্পন্ন করেছে।',
  'Patched by the road maintenance crew; will re-inspect after monsoon.',
  'Manhole cover replaced and area cleared.',
  'Drain cleared, water receded. Surface repair scheduled.',
  'Rubble removed by the ward councillor’s office.',
];

// Deterministic randomness so --reset rebuilds the same dataset.
let seed = 20261107;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const between = (min, max) => min + rand() * (max - min);
const pick = (list) => list[Math.floor(rand() * list.length)];
const labelFor = (s) => (s <= 30 ? 'LOW' : s <= 60 ? 'MODERATE' : s <= 80 ? 'HIGH' : 'CRITICAL');

async function removeDemo() {
  const reports = await Report.deleteMany({ modelVersion: MODEL_VERSION });
  const users = await User.deleteMany({ email: new RegExp(`@${EMAIL_DOMAIN.replace('.', '\\.')}$`) });
  console.log(`[seed-demo] removed ${reports.deletedCount} demo reports and ${users.deletedCount} demo users`);
}

async function ensureCitizens() {
  const users = [];
  for (const [name, district] of CITIZENS) {
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${EMAIL_DOMAIN}`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'citizen',
        district,
      });
    }
    users.push(user);
  }
  return users;
}

function buildReport(citizens, index) {
  const [locationName, district, lat, lng] = PLACES[index % PLACES.length];
  const hazard = pick(HAZARD_MIX);
  const [lo, hi] = HAZARD_RISK[hazard];
  const variant = Math.floor(rand() * 2);

  const primary = {
    type: hazard,
    confidence: Number(between(0.71, 0.97).toFixed(2)),
    severity: Math.round(between(lo, hi)),
    areaRatio: Number(between(0.03, 0.28).toFixed(3)),
    boundingBox: BOXES[hazard][variant],
  };
  primary.severityLabel = labelFor(primary.severity);

  const detections = [primary];
  // Roughly a third of photos show a second, lesser defect too.
  if (rand() < 0.33) {
    const extra = pick(['road_crack', 'pothole', 'debris', 'waterlogging'].filter((h) => h !== hazard));
    const severity = Math.round(between(10, Math.max(15, primary.severity - 10)));
    detections.push({
      type: extra,
      confidence: Number(between(0.55, 0.85).toFixed(2)),
      severity,
      severityLabel: labelFor(severity),
      areaRatio: Number(between(0.01, 0.08).toFixed(3)),
      boundingBox: { x1: 120, y1: 600, x2: 330, y2: 720 },
    });
  }

  const overall = Math.min(100, Math.round(primary.severity + (detections.length > 1 ? 4 : 0)));
  const severityLabel = labelFor(overall);

  // Skew towards recent days so the trend chart rises, as adoption would.
  const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 90);
  const createdAt = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rand() * 86400000));
  const processingTimeMs = Math.round(between(19000, 56000));
  const processedAt = new Date(createdAt.getTime() + processingTimeMs);

  // Older and less severe reports are more likely to have been fixed already.
  const resolveChance = daysAgo > 30 ? 0.55 : daysAgo > 10 ? 0.3 : 0.08;
  const resolved = rand() < resolveChance;
  const resolvedAt = resolved
    ? new Date(Math.min(Date.now() - 3600000, processedAt.getTime() + between(1, 12) * 86400000))
    : null;

  const citizen = pick(citizens);

  return {
    imageUrl: `/demo/${hazard}-${variant}.svg`,
    annotatedImageUrl: `/demo/${hazard}-${variant}-annotated.svg`,
    latitude: Number((lat + (rand() - 0.5) * 0.012).toFixed(6)),
    longitude: Number((lng + (rand() - 0.5) * 0.012).toFixed(6)),
    locationName,
    district,
    description: pick(DESCRIPTIONS[hazard]),
    status: 'completed',
    detections,
    overallSeverity: overall,
    severityLabel,
    primaryHazard: hazard,
    modelVersion: MODEL_VERSION,
    processingTimeMs,
    resolutionStatus: resolved ? 'resolved' : 'unresolved',
    lifecycle: resolved
      ? 'RESOLVED'
      : severityLabel === 'CRITICAL' || severityLabel === 'HIGH'
      ? 'PRIORITIZED'
      : 'AI_COMPLETED',
    priority: overall,
    authorityNote: resolved ? pick(AUTHORITY_NOTES) : '',
    resolvedAt,
    reportedBy: citizen._id,
    reporterName: citizen.name,
    createdAt,
    updatedAt: resolvedAt || processedAt,
    processedAt,
  };
}

async function run() {
  const args = process.argv.slice(2);
  await connectDB();

  if (args.includes('--remove') || args.includes('--reset')) await removeDemo();
  if (args.includes('--remove')) return mongoose.connection.close();

  const existing = await Report.countDocuments({ modelVersion: MODEL_VERSION });
  if (existing > 0) {
    console.log(`[seed-demo] ${existing} demo reports already present. Use --reset to rebuild them.`);
    return mongoose.connection.close();
  }

  const citizens = await ensureCitizens();
  const COUNT = 74;
  const docs = Array.from({ length: COUNT }, (_, i) => buildReport(citizens, i));

  // insertMany with timestamps:false keeps our historical createdAt values.
  await Report.insertMany(docs, { timestamps: false });

  const bySeverity = docs.reduce((acc, d) => ((acc[d.severityLabel] = (acc[d.severityLabel] || 0) + 1), acc), {});
  const resolved = docs.filter((d) => d.resolutionStatus === 'resolved').length;
  console.log(`[seed-demo] inserted ${docs.length} reports from ${citizens.length} demo citizens`);
  console.log(`[seed-demo] severity: ${JSON.stringify(bySeverity)} · resolved: ${resolved}`);
  return mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('[seed-demo] failed:', err.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
