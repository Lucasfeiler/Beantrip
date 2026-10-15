import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin, requireShopOwner, requirePremium } from '../middleware/auth.js';
import { writeLimiter, trackingLimiter } from '../middleware/rateLimit.js';
import { getStorageBucket } from '../firebase.js';
import { sendOwnerReminderEmail } from '../mailer.js';

export const shopsRouter = Router();

function publicOrigin() {
  return (process.env.CLIENT_ORIGIN || '').split(',')[0].trim();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Photo must be a JPEG, PNG, or WebP image'));
    }
    cb(null, true);
  },
});

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

shopsRouter.get('/', async (req, res) => {
  const { city, tag, query, openNow } = req.query;

  const shops = await prisma.shop.findMany({ orderBy: { id: 'asc' } });

  const todayKey = dayKeys[new Date().getDay()];
  const filtered = shops.filter((s) => {
    if (city && s.city !== city) return false;
    if (tag && !s.tags.includes(tag)) return false;
    if (query && !`${s.name} ${s.neighborhood ?? ''} ${s.address}`.toLowerCase().includes(String(query).toLowerCase())) return false;
    if (openNow === 'true' && !(s.hours && s.hours[todayKey])) return false;
    return true;
  });

  // Shop data barely changes minute to minute, but every page that needs the
  // list re-requests it -- a short cache avoids re-running this full-table
  // scan and re-sending the ~700KB payload for every repeat request.
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ shops: filtered });
});

shopsRouter.get('/meta', async (_req, res) => {
  const shops = await prisma.shop.findMany({ select: { city: true, tags: true } });
  const cities = Array.from(new Set(shops.map((s) => s.city))).sort();
  const allTags = Array.from(new Set(shops.flatMap((s) => s.tags))).sort();
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ cities, allTags });
});

shopsRouter.get('/mine', requireAuth, async (req, res) => {
  const shops = await prisma.shop.findMany({
    where: { ownerId: req.user.sub },
    include: { beans: { orderBy: { createdAt: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  res.json({ shops });
});

shopsRouter.get('/admin/premium', requireAuth, requireAdmin, async (_req, res) => {
  const shops = await prisma.shop.findMany({
    where: { ownerId: { not: null } },
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ shops });
});

shopsRouter.post('/admin/remind-owners', requireAuth, requireAdmin, async (_req, res) => {
  const shops = await prisma.shop.findMany({
    where: { ownerId: { not: null } },
    include: { owner: { select: { email: true } } },
  });

  const myShopUrl = `${publicOrigin()}/my-shop`;
  const results = await Promise.allSettled(
    shops.map((shop) => sendOwnerReminderEmail(shop.owner.email, shop.name, myShopUrl))
  );
  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  res.json({ sent, failed, total: shops.length });
});

shopsRouter.get('/:slug', async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { slug: req.params.slug },
    include: { beans: { orderBy: { createdAt: 'asc' } } },
  });
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  res.json({ shop });
});

const TASTES = ['bright', 'earthy'];
const ORIGIN_COUNTRIES = ['ethiopia', 'colombia', 'brazil', 'kenya', 'guatemala', 'tanzania', 'jamaica', 'costa-rica', 'indonesia', 'yemen'];

shopsRouter.patch('/:slug', requireAuth, requireShopOwner, writeLimiter, async (req, res) => {
  const { description, tags, hours, website, instagram, espressoMachine, beanType, taste, originCountry, beansInStock } = req.body;

  if (beansInStock !== undefined && !req.shop.isPremium) {
    return res.status(403).json({ error: 'This feature requires Café Premium' });
  }
  if (beanType !== undefined && beanType !== null && !['arabica', 'robusta'].includes(beanType)) {
    return res.status(400).json({ error: 'Invalid bean type' });
  }
  if (taste !== undefined && taste !== null && !TASTES.includes(taste)) {
    return res.status(400).json({ error: 'Invalid taste value' });
  }
  if (originCountry !== undefined && originCountry !== null && !ORIGIN_COUNTRIES.includes(originCountry)) {
    return res.status(400).json({ error: 'Invalid origin country' });
  }

  const shop = await prisma.shop.update({
    where: { id: req.shop.id },
    data: {
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(Array.isArray(tags) ? { tags } : {}),
      ...(hours !== undefined ? { hours } : {}),
      ...(website !== undefined ? { website: website?.trim() || null } : {}),
      ...(instagram !== undefined ? { instagram: instagram?.trim() || null } : {}),
      ...(espressoMachine !== undefined ? { espressoMachine: espressoMachine?.trim() || null } : {}),
      ...(beanType !== undefined ? { beanType } : {}),
      ...(taste !== undefined ? { taste } : {}),
      ...(originCountry !== undefined ? { originCountry } : {}),
      ...(beansInStock !== undefined ? { beansInStock } : {}),
    },
  });

  res.json({ shop });
});

shopsRouter.post('/:slug/track', trackingLimiter, async (req, res) => {
  const { type, target } = req.body;
  if (!['view', 'click'].includes(type)) return res.status(400).json({ error: 'Invalid event type' });
  if (type === 'click' && !['website', 'instagram', 'directions'].includes(target)) {
    return res.status(400).json({ error: 'Invalid click target' });
  }

  const shop = await prisma.shop.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
  if (!shop) return res.status(404).json({ error: 'Shop not found' });

  await prisma.shopEvent.create({
    data: { shopId: shop.id, type, target: type === 'click' ? target : null },
  });

  res.status(201).json({ ok: true });
});

shopsRouter.get('/:slug/analytics', requireAuth, requireShopOwner, requirePremium, async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.shopEvent.findMany({
    where: { shopId: req.shop.id, createdAt: { gte: since } },
    select: { type: true, target: true, createdAt: true },
  });

  const daily = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (29 - i));
    return { date: d.toISOString().slice(0, 10), views: 0, clicks: 0 };
  });
  const dailyIndex = Object.fromEntries(daily.map((d, i) => [d.date, i]));

  const hourlyToday = Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0, clicks: 0 }));
  const todayKey = new Date().toISOString().slice(0, 10);

  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const bucket = e.type === 'view' ? 'views' : 'clicks';
    if (dailyIndex[key] !== undefined) daily[dailyIndex[key]][bucket]++;
    if (key === todayKey) hourlyToday[e.createdAt.getUTCHours()][bucket]++;
  }

  res.json({
    daily,
    hourlyToday,
    totals: {
      views: events.filter((e) => e.type === 'view').length,
      clicks: events.filter((e) => e.type === 'click').length,
    },
  });
});

shopsRouter.patch('/:slug/premium', requireAuth, requireAdmin, async (req, res) => {
  const { isPremium } = req.body;
  if (typeof isPremium !== 'boolean') return res.status(400).json({ error: 'isPremium must be a boolean' });

  const shop = await prisma.shop.update({
    where: { slug: req.params.slug },
    data: { isPremium },
  });

  res.json({ shop });
});

shopsRouter.post('/:slug/photo', requireAuth, requireShopOwner, writeLimiter, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    try {
      const ext = req.file.mimetype.split('/')[1];
      const filename = `shops/${req.shop.id}-${randomUUID()}.${ext}`;
      const bucket = getStorageBucket();
      const blob = bucket.file(filename);

      await blob.save(req.file.buffer, { contentType: req.file.mimetype });
      await blob.makePublic();
      const photoUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      const existingImages = Array.isArray(req.shop.images) ? req.shop.images : [];
      const images = [...existingImages, photoUrl];

      const shop = await prisma.shop.update({
        where: { id: req.shop.id },
        data: { images, image: req.shop.image ?? photoUrl },
      });

      res.json({ shop });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });
});

shopsRouter.delete('/:slug/photo', requireAuth, requireShopOwner, writeLimiter, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const existingImages = Array.isArray(req.shop.images) ? req.shop.images : [];
  if (!existingImages.includes(url)) return res.status(404).json({ error: 'Photo not found on this shop' });

  const images = existingImages.filter((img) => img !== url);
  const image = req.shop.image === url ? (images[0] ?? null) : req.shop.image;

  const shop = await prisma.shop.update({
    where: { id: req.shop.id },
    data: { images, image },
  });

  try {
    const bucket = getStorageBucket();
    const filename = decodeURIComponent(new URL(url).pathname.split('/').slice(2).join('/'));
    await bucket.file(filename).delete();
  } catch (e) {
    console.error('Failed to delete storage file (non-fatal):', e.message);
  }

  res.json({ shop });
});

const ROASTS = ['light', 'medium', 'dark'];

shopsRouter.post('/:slug/beans', requireAuth, requireShopOwner, writeLimiter, async (req, res) => {
  const { name, roast, origin } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (roast && !ROASTS.includes(roast)) return res.status(400).json({ error: 'Invalid roast value' });
  if (origin && !ORIGIN_COUNTRIES.includes(origin)) return res.status(400).json({ error: 'Invalid origin value' });

  const bean = await prisma.bean.create({
    data: { shopId: req.shop.id, name: name.trim(), roast: roast || null, origin: origin || null },
  });

  res.status(201).json({ bean });
});

shopsRouter.delete('/:slug/beans/:beanId', requireAuth, requireShopOwner, async (req, res) => {
  const bean = await prisma.bean.findUnique({ where: { id: Number(req.params.beanId) } });
  if (!bean || bean.shopId !== req.shop.id) return res.status(404).json({ error: 'Bean not found' });

  await prisma.bean.delete({ where: { id: bean.id } });
  res.json({ ok: true });
});
