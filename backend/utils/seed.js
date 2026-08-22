/**
 * Optional demo seeder: creates an admin account and a handful of completed
 * reports across Bangladesh so the dashboard and map have something to show
 * before the ML worker has run. Usage:  npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Report = require('../models/Report');

const SAMPLE_IMAGE =
  'https://res.cloudinary.com/demo/image/upload/w_1200,h_800,c_fill/sample.jpg';

const PLACES = [
  { locationName: 'Zindabazar Point', district: 'Sylhet', latitude: 24.8949, longitude: 91.8687 },
  { locationName: 'Amberkhana Crossing', district: 'Sylhet', latitude: 24.9045, longitude: 91.8712 },
  { locationName: 'Mirpur Road, Dhanmondi', district: 'Dhaka', latitude: 23.7461, longitude: 90.376 },
  { locationName: 'Gulshan 2 Circle', district: 'Dhaka', latitude: 23.7925, longitude: 90.4078 },
  { locationName: 'Agrabad C/A', district: 'Chattogram', latitude: 22.3286, longitude: 91.8123 },
  { locationName: 'Zero Point', district: 'Rajshahi', latitude: 24.3636, longitude: 88.6241 },
  { locationName: 'Sadar Road', district: 'Barishal', latitude: 22.7017, longitude: 90.3535 },
  { locationName: 'Shaheb Bazar', district: 'Khulna', latitude: 22.8456, longitude: 89.5403 },
];

const HAZARDS = ['pothole', 'road_crack', 'broken_road', 'open_manhole', 'waterlogging', 'debris'];

const labelFor = (s) => (s <= 30 ? 'LOW' : s <= 60 ? 'MODERATE' : s <= 80 ? 'HIGH' : 'CRITICAL');
const rand = (min, max) => Math.round(min + Math.random() * (max - min));

async function run() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || 'admin@drishti.ai';
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      name: 'DRISHTI Admin',
      email,
      password: 'drishti12345',
      role: 'admin',
      organization: 'City Corporation',
      district: 'Sylhet',
    });
    console.log(`[seed] admin created → ${email} / drishti12345`);
  } else {
    console.log(`[seed] admin already exists → ${email}`);
  }

  const existing = await Report.countDocuments({});
  if (existing > 0) {
    console.log(`[seed] ${existing} reports already present, skipping report seeding`);
    await mongoose.connection.close();
    return;
  }

  const docs = PLACES.flatMap((place, i) =>
    [0, 1].map((k) => {
      const hazard = HAZARDS[(i + k) % HAZARDS.length];
      const severity = rand(18, 96);
      const daysAgo = rand(0, 25);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);
      return {
        ...place,
        latitude: place.latitude + (Math.random() - 0.5) * 0.01,
        longitude: place.longitude + (Math.random() - 0.5) * 0.01,
        imageUrl: SAMPLE_IMAGE,
        annotatedImageUrl: SAMPLE_IMAGE,
        description: 'Seeded demo report for dashboard and map preview.',
        status: 'completed',
        detections: [
          {
            type: hazard,
            confidence: rand(72, 97) / 100,
            severity,
            severityLabel: labelFor(severity),
            areaRatio: rand(2, 25) / 100,
            boundingBox: { x1: 120, y1: 140, x2: 520, y2: 430 },
          },
        ],
        overallSeverity: severity,
        severityLabel: labelFor(severity),
        primaryHazard: hazard,
        priority: severity,
        modelVersion: 'seed-demo',
        processingTimeMs: rand(18000, 52000),
        resolutionStatus: Math.random() > 0.7 ? 'resolved' : 'unresolved',
        lifecycle: severity > 60 ? 'PRIORITIZED' : 'AI_COMPLETED',
        reportedBy: admin._id,
        reporterName: admin.name,
        createdAt,
        processedAt: new Date(createdAt.getTime() + 45000),
      };
    })
  );

  await Report.insertMany(docs);
  console.log(`[seed] inserted ${docs.length} demo reports`);
  await mongoose.connection.close();
}

run().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
