import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { randomUUID, randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, forgotPasswordLimiter, writeLimiter } from '../middleware/rateLimit.js';
import { getStorageBucket } from '../firebase.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../mailer.js';

export const authRouter = Router();

// CLIENT_ORIGIN is a comma-separated allow-list for CORS; the first entry
// doubles as the canonical site URL for links sent in emails.
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

async function deleteAvatarBlob(avatarUrl) {
  if (!avatarUrl) return;
  try {
    const bucket = getStorageBucket();
    const filePath = avatarUrl.split(`${bucket.name}/`)[1];
    if (filePath) await bucket.file(filePath).delete({ ignoreNotFound: true });
  } catch (e) {
    console.error('Failed to delete avatar from storage', e);
  }
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user, visitCount = 0) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    location: user.location,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    isPremium: user.isPremium,
    accountType: user.accountType,
    emailVerified: user.emailVerified,
    gender: user.gender,
    favoriteRoast: user.favoriteRoast,
    favoriteBrewMethod: user.favoriteBrewMethod,
    ageRange: user.ageRange,
    coffeeSpend: user.coffeeSpend,
    referralSource: user.referralSource,
    occupation: user.occupation,
    onboardingSeen: user.onboardingSeen,
    tourSeen: user.tourSeen,
    marketingConsent: user.marketingConsent,
    createdAt: user.createdAt,
    visitCount,
  };
}

async function createAndSendVerificationEmail(user) {
  const token = randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  const verifyUrl = `${publicOrigin()}/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, verifyUrl);
}

authRouter.post('/register', authLimiter, async (req, res) => {
  const { email, password, name, accountType } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, accountType: accountType === 'business' ? 'business' : 'customer' },
  });

  try {
    await createAndSendVerificationEmail(user);
  } catch (e) {
    console.error('Failed to send verification email', e);
  }

  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

authRouter.post('/verify-email', authLimiter, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired' });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: verificationToken.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.update({ where: { id: verificationToken.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ ok: true });
});

authRouter.post('/resend-verification', requireAuth, forgotPasswordLimiter, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Your email is already verified' });

  try {
    await createAndSendVerificationEmail(user);
  } catch (e) {
    console.error('Failed to send verification email', e);
    return res.status(500).json({ error: 'Failed to send verification email' });
  }

  res.json({ ok: true });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const visitCount = await prisma.visit.count({ where: { userId: user.id } });
  res.json({ token: issueToken(user), user: publicUser(user, visitCount) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const visitCount = await prisma.visit.count({ where: { userId: user.id } });
  res.json({ user: publicUser(user, visitCount) });
});

const GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
const ROASTS = ['light', 'medium', 'dark'];
const BREW_METHODS = ['espresso', 'pour-over', 'cold-brew', 'french-press', 'aeropress', 'v60'];
const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const COFFEE_SPENDS = ['under-5', '5-10', '10-15', '15-plus'];
const REFERRAL_SOURCES = ['word-of-mouth', 'social-media', 'search', 'other'];
const OCCUPATIONS = ['remote-worker', 'student', 'office-worker', 'other'];

authRouter.patch('/me', requireAuth, async (req, res) => {
  const {
    name, location, bio, gender, favoriteRoast, favoriteBrewMethod,
    ageRange, coffeeSpend, referralSource, occupation,
    onboardingSeen, tourSeen, marketingConsent,
  } = req.body;
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }
  if (gender !== undefined && gender !== null && !GENDERS.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender value' });
  }
  if (favoriteRoast !== undefined && favoriteRoast !== null && !ROASTS.includes(favoriteRoast)) {
    return res.status(400).json({ error: 'Invalid roast value' });
  }
  if (favoriteBrewMethod !== undefined && favoriteBrewMethod !== null && !BREW_METHODS.includes(favoriteBrewMethod)) {
    return res.status(400).json({ error: 'Invalid brew method value' });
  }
  if (ageRange !== undefined && ageRange !== null && !AGE_RANGES.includes(ageRange)) {
    return res.status(400).json({ error: 'Invalid age range value' });
  }
  if (coffeeSpend !== undefined && coffeeSpend !== null && !COFFEE_SPENDS.includes(coffeeSpend)) {
    return res.status(400).json({ error: 'Invalid coffee spend value' });
  }
  if (referralSource !== undefined && referralSource !== null && !REFERRAL_SOURCES.includes(referralSource)) {
    return res.status(400).json({ error: 'Invalid referral source value' });
  }
  if (occupation !== undefined && occupation !== null && !OCCUPATIONS.includes(occupation)) {
    return res.status(400).json({ error: 'Invalid occupation value' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.sub },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(location !== undefined ? { location: location.trim() || null } : {}),
      ...(bio !== undefined ? { bio: bio.trim() || null } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(favoriteRoast !== undefined ? { favoriteRoast } : {}),
      ...(favoriteBrewMethod !== undefined ? { favoriteBrewMethod } : {}),
      ...(ageRange !== undefined ? { ageRange } : {}),
      ...(coffeeSpend !== undefined ? { coffeeSpend } : {}),
      ...(referralSource !== undefined ? { referralSource } : {}),
      ...(occupation !== undefined ? { occupation } : {}),
      ...(onboardingSeen !== undefined ? { onboardingSeen: !!onboardingSeen } : {}),
      ...(tourSeen !== undefined ? { tourSeen: !!tourSeen } : {}),
      ...(marketingConsent !== undefined ? { marketingConsent: !!marketingConsent } : {}),
    },
  });

  const visitCount = await prisma.visit.count({ where: { userId: user.id } });
  res.json({ user: publicUser(user, visitCount) });
});

authRouter.post('/me/photo', requireAuth, writeLimiter, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    try {
      const ext = req.file.mimetype.split('/')[1];
      const filename = `avatars/${req.user.sub}-${randomUUID()}.${ext}`;
      const bucket = getStorageBucket();
      const blob = bucket.file(filename);

      await blob.save(req.file.buffer, { contentType: req.file.mimetype });
      await blob.makePublic();
      const avatarUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      const user = await prisma.user.update({ where: { id: req.user.sub }, data: { avatarUrl } });
      const visitCount = await prisma.visit.count({ where: { userId: user.id } });
      res.json({ user: publicUser(user, visitCount) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });
});

authRouter.delete('/me/photo', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  await deleteAvatarBlob(user.avatarUrl);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  const visitCount = await prisma.visit.count({ where: { userId: user.id } });
  res.json({ user: publicUser(updated, visitCount) });
});

authRouter.patch('/me/email', requireAuth, authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { email } });
  const visitCount = await prisma.visit.count({ where: { userId: user.id } });
  res.json({ token: issueToken(updated), user: publicUser(updated, visitCount) });
});

authRouter.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to check which emails have accounts.
  if (user) {
    const token = randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const resetUrl = `${publicOrigin()}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (e) {
      console.error('Failed to send password reset email', e);
    }
  }

  res.json({ ok: true });
});

authRouter.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ ok: true });
});

authRouter.delete('/me', requireAuth, authLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required to delete your account' });

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  await deleteAvatarBlob(user.avatarUrl);

  const reviews = await prisma.review.findMany({ where: { userId: req.user.sub }, select: { shopId: true } });
  await prisma.user.delete({ where: { id: req.user.sub } });

  for (const shopId of new Set(reviews.map((r) => r.shopId))) {
    const agg = await prisma.review.aggregate({ where: { shopId }, _avg: { rating: true }, _count: { rating: true } });
    await prisma.shop.update({ where: { id: shopId }, data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count.rating } });
  }

  res.status(204).end();
});
