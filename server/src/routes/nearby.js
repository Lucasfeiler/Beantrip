import { Router } from 'express';
import { prisma } from '../db.js';

export const nearbyRouter = Router();

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

nearbyRouter.get('/', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radius = Math.min(Number(req.query.radius) || 15000, 50000);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const shops = await prisma.shop.findMany({ where: { lat: { not: null }, lng: { not: null } } });

  const nearby = shops
    .map((s) => ({ ...s, distanceMeters: Math.round(haversineMeters(lat, lon, s.lat, s.lng)) }))
    .filter((s) => s.distanceMeters <= radius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 30);

  res.json({ shops: nearby });
});
