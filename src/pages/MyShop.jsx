import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShops } from '../context/ShopsContext';
import { api } from '../lib/api';
import ShopQRCode from '../components/ShopQRCode';

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const dayLabels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function MyShop() {
  const { user, loading: authLoading } = useAuth();
  const { shops } = useShops();
  const navigate = useNavigate();

  const [myShops, setMyShops] = useState(null);
  const [myClaims, setMyClaims] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.accountType !== 'business') return;
    Promise.all([api.myShops(), api.myClaims()])
      .then(([shopsRes, claimsRes]) => {
        setMyShops(shopsRes.shops);
        setMyClaims(claimsRes.claims);
      })
      .catch((err) => setLoadError(err.message));
  }, [user]);

  if (authLoading || !user) return null;

  if (user.accountType !== 'business') {
    return (
      <div className="max-w-lg mx-auto px-5 sm:px-8 py-24 text-center">
        <p className="font-display text-2xl mb-3">Business accounts only</p>
        <p className="text-sm text-[var(--color-muted-fg)]">
          Claiming and managing a shop listing is only available for cafe owner accounts.
        </p>
      </div>
    );
  }

  if (myShops === null) {
    return <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 text-center text-[var(--color-muted-fg)]">Loading…</div>;
  }

  if (loadError) {
    return <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 text-center text-red-600">{loadError}</div>;
  }

  if (myShops.length === 0) {
    return <ClaimShopFlow shops={shops} claims={myClaims} onClaimed={() => api.myClaims().then((r) => setMyClaims(r.claims))} />;
  }

  return <EditShopForm shop={myShops[0]} onSaved={(shop) => setMyShops([shop])} />;
}

function ClaimShopFlow({ shops, claims, onClaimed }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const claimedShopIds = new Set(claims.filter((c) => c.status === 'pending').map((c) => c.shopId));
  const available = shops.filter(
    (s) => !s.ownerId && !claimedShopIds.has(s.id) && s.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    setSubmitting(true);
    try {
      await api.claimShop(selectedId, message);
      setSubmitted(true);
      onClaimed();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-8 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold">Claim Your Cafe</h1>
      <p className="text-[var(--color-muted-fg)] mt-2">
        Find your cafe in the list below to request ownership. We'll review it and get you access to edit
        its listing.
      </p>

      {claims.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {claims.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-2.5">
              <span>{c.shop.name} <span className="text-[var(--color-muted-fg)]">· {c.shop.city}</span></span>
              <span className={c.status === 'pending' ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted-fg)]'}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {submitted ? (
        <p className="mt-8 text-sm text-[var(--color-accent)] font-semibold">
          Claim submitted — we'll review it and let you know.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input
            placeholder="Search for your cafe by name…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }}
            className={inputClass}
          />
          {query && (
            <div className="max-h-60 overflow-y-auto flex flex-col gap-1 border border-[var(--color-border)] rounded-xl p-2">
              {available.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-fg)] px-2 py-2">No unclaimed shops match.</p>
              ) : (
                available.slice(0, 20).map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedId === s.id ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]' : 'hover:bg-[var(--color-card)]'
                    }`}
                  >
                    {s.name} <span className={selectedId === s.id ? 'opacity-80' : 'text-[var(--color-muted-fg)]'}>· {s.city}</span>
                  </button>
                ))
              )}
            </div>
          )}
          <textarea
            placeholder="Anything that helps us verify you own this cafe (optional)"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={!selectedId || submitting}
            className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit claim'}
          </button>
        </form>
      )}
    </div>
  );
}

function EditShopForm({ shop, onSaved }) {
  const [description, setDescription] = useState(shop.description ?? '');
  const [tags, setTags] = useState((shop.tags ?? []).join(', '));
  const [website, setWebsite] = useState(shop.website ?? '');
  const [instagram, setInstagram] = useState(shop.instagram ?? '');
  const [espressoMachine, setEspressoMachine] = useState(shop.espressoMachine ?? '');
  const [beanType, setBeanType] = useState(shop.beanType ?? '');
  const [taste, setTaste] = useState(shop.taste ?? '');
  const [originCountry, setOriginCountry] = useState(shop.originCountry ?? '');
  const [hours, setHours] = useState(shop.hours ?? {});
  const [beansInStock, setBeansInStock] = useState(shop.beansInStock ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [photoError, setPhotoError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  const [beans, setBeans] = useState(shop.beans ?? []);
  const [beanName, setBeanName] = useState('');
  const [beanRoast, setBeanRoast] = useState('');
  const [beanOrigin, setBeanOrigin] = useState('');
  const [beanError, setBeanError] = useState('');
  const [addingBean, setAddingBean] = useState(false);
  const [deletingBeanId, setDeletingBeanId] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = { description, tags: tagList, website, instagram, espressoMachine, beanType: beanType || null, taste: taste || null, originCountry: originCountry || null, hours };
      if (shop.isPremium) payload.beansInStock = beansInStock;
      const shopRes = await api.updateShop(shop.slug, payload);
      onSaved({ ...shopRes.shop, beans });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setUploading(true);
    try {
      const { shop: updated } = await api.uploadShopPhoto(shop.slug, file);
      onSaved({ ...updated, beans });
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePhotoDelete = async (url) => {
    setPhotoError('');
    setDeletingPhoto(url);
    try {
      const { shop: updated } = await api.deleteShopPhoto(shop.slug, url);
      onSaved({ ...updated, beans });
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleAddBean = async (e) => {
    e.preventDefault();
    if (!beanName.trim()) return;
    setBeanError('');
    setAddingBean(true);
    try {
      const { bean } = await api.addBean(shop.slug, { name: beanName.trim(), roast: beanRoast || null, origin: beanOrigin || null });
      setBeans((bs) => [...bs, bean]);
      setBeanName('');
      setBeanRoast('');
      setBeanOrigin('');
    } catch (err) {
      setBeanError(err.message);
    } finally {
      setAddingBean(false);
    }
  };

  const handleDeleteBean = async (beanId) => {
    setBeanError('');
    setDeletingBeanId(beanId);
    try {
      await api.deleteBean(shop.slug, beanId);
      setBeans((bs) => bs.filter((b) => b.id !== beanId));
    } catch (err) {
      setBeanError(err.message);
    } finally {
      setDeletingBeanId(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-8 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold">{shop.name}</h1>
      <p className="text-[var(--color-muted-fg)] mt-1">{shop.address}, {shop.city}</p>
      <p className="text-xs font-semibold mt-2">
        {shop.isPremium ? (
          <span className="text-[var(--color-accent)]">☕ Café Premium</span>
        ) : (
          <span className="text-[var(--color-muted-fg)]">Free plan</span>
        )}
      </p>

      {shop.isPremium ? (
        <PremiumPanel shop={shop} />
      ) : (
        <div className="mt-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">Café Premium</p>
          <p className="text-sm text-[var(--color-muted-fg)]">
            Unlock view/click analytics and a beans in-stock/out-of-stock status for your listing. Get in
            touch with us to enable it for your café.
          </p>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold mb-2">Photos</p>
        {shop.images?.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {shop.images.map((src) => (
              <div key={src} className="relative w-20 h-20">
                <img src={src} alt={shop.name} className="w-full h-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => handlePhotoDelete(src)}
                  disabled={deletingPhoto === src}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center disabled:opacity-60"
                >
                  {deletingPhoto === src ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="inline-block text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer">
          {uploading ? 'Uploading…' : 'Add a photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={uploading} className="hidden" />
        </label>
        <p className="text-xs text-[var(--color-muted-fg)] mt-1">JPEG, PNG, or WebP — up to 5MB</p>
        {photoError && <p className="text-sm text-red-600 mt-2">{photoError}</p>}
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold mb-2">Beans</p>
        <p className="text-xs text-[var(--color-muted-fg)] mb-3">The beans you currently serve. Add new ones, remove any you no longer carry.</p>
        {beans.length > 0 && (
          <ul className="flex flex-col gap-2 mb-3">
            {beans.map((b) => (
              <li key={b.id} className="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{b.name}</p>
                  {(b.roast || b.origin) && (
                    <p className="text-xs text-[var(--color-muted-fg)] capitalize">
                      {[b.roast, b.origin?.replace('-', ' ')].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBean(b.id)}
                  disabled={deletingBeanId === b.id}
                  className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                >
                  {deletingBeanId === b.id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddBean} className="flex flex-wrap gap-2 items-start">
          <input
            value={beanName}
            onChange={(e) => setBeanName(e.target.value)}
            placeholder="Bean name, e.g. Ethiopia Guji"
            className={`${inputClass} flex-1 min-w-[10rem]`}
          />
          <select value={beanRoast} onChange={(e) => setBeanRoast(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="">Roast</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="dark">Dark</option>
          </select>
          <select value={beanOrigin} onChange={(e) => setBeanOrigin(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="">Origin</option>
            {[
              ['ethiopia', 'Ethiopia'], ['colombia', 'Colombia'], ['brazil', 'Brazil'], ['kenya', 'Kenya'],
              ['guatemala', 'Guatemala'], ['tanzania', 'Tanzania'], ['jamaica', 'Jamaica'],
              ['costa-rica', 'Costa Rica'], ['indonesia', 'Indonesia'], ['yemen', 'Yemen'],
            ].map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            disabled={addingBean || !beanName.trim()}
            className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm disabled:opacity-60"
          >
            {addingBean ? 'Adding…' : 'Add bean'}
          </button>
        </form>
        {beanError && <p className="text-sm text-red-600 mt-2">{beanError}</p>}
      </div>

      <ShopQRCode slug={shop.slug} />

      <form onSubmit={handleSave} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. light roast, pour over, wifi" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Website</span>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Instagram</span>
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/…" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Espresso machine</span>
          <input value={espressoMachine} onChange={(e) => setEspressoMachine(e.target.value)} placeholder="e.g. La Marzocco, Flair, La Pavoni…" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Bean type</span>
          <div className="grid grid-cols-3 gap-2">
            {[['', 'Not set'], ['arabica', 'Arabica'], ['robusta', 'Robusta']].map(([value, label]) => (
              <button
                key={value || 'none'}
                type="button"
                onClick={() => setBeanType(value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  beanType === value ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Taste</span>
          <div className="grid grid-cols-3 gap-2">
            {[['', 'Not set'], ['bright', 'Bright / Acidic'], ['earthy', 'Earthy / Full Body']].map(([value, label]) => (
              <button
                key={value || 'none'}
                type="button"
                onClick={() => setTaste(value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  taste === value ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Bean origin country</span>
          <select
            value={originCountry}
            onChange={(e) => setOriginCountry(e.target.value)}
            className={inputClass}
          >
            <option value="">Not set</option>
            {[
              ['ethiopia', 'Ethiopia'], ['colombia', 'Colombia'], ['brazil', 'Brazil'], ['kenya', 'Kenya'],
              ['guatemala', 'Guatemala'], ['tanzania', 'Tanzania'], ['jamaica', 'Jamaica'],
              ['costa-rica', 'Costa Rica'], ['indonesia', 'Indonesia'], ['yemen', 'Yemen'],
            ].map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        {shop.isPremium && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Beans in stock</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBeansInStock(true)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  beansInStock ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
                }`}
              >
                In stock
              </button>
              <button
                type="button"
                onClick={() => setBeansInStock(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  !beansInStock ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
                }`}
              >
                Out of stock
              </button>
            </div>
          </label>
        )}

        <div>
          <p className="text-sm font-medium mb-2">Opening hours</p>
          <div className="flex flex-col gap-2">
            {dayKeys.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-10 text-xs font-medium text-[var(--color-muted-fg)]">{dayLabels[day]}</span>
                <input
                  value={hours[day] ?? ''}
                  onChange={(e) => setHours((h) => ({ ...h, [day]: e.target.value }))}
                  placeholder="e.g. 8:00–18:00 or Closed"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-[var(--color-accent)] font-semibold">Saved.</p>}
        <button disabled={saving} className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

function PremiumPanel({ shop }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.shopAnalytics(shop.slug)
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [shop.slug]);

  const recentDays = stats?.daily.slice(-7) ?? [];

  return (
    <div className="mt-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
      <p className="text-sm font-semibold mb-3">Analytics (last 30 days)</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!stats && !error && <p className="text-sm text-[var(--color-muted-fg)]">Loading…</p>}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="font-display text-2xl font-semibold">{stats.totals.views}</p>
              <p className="text-xs text-[var(--color-muted-fg)]">Listing views</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">{stats.totals.clicks}</p>
              <p className="text-xs text-[var(--color-muted-fg)]">Website/Instagram/directions clicks</p>
            </div>
          </div>
          <p className="text-xs font-medium text-[var(--color-muted-fg)] mb-1.5">Last 7 days</p>
          <dl className="text-sm divide-y divide-[var(--color-border)]">
            {recentDays.map((d) => (
              <div key={d.date} className="flex justify-between py-1">
                <dt className="text-[var(--color-muted-fg)]">{d.date}</dt>
                <dd>{d.views} views · {d.clicks} clicks</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <ReviewReplies shop={shop} />
    </div>
  );
}

function ReviewReplies({ shop }) {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    api.listReviews(shop.slug)
      .then(({ reviews }) => {
        setReviews(reviews);
        setDrafts(Object.fromEntries(reviews.map((r) => [r.id, r.ownerReply ?? ''])));
      })
      .catch((err) => setError(err.message));
  }, [shop.slug]);

  const saveReply = async (reviewId) => {
    setSavingId(reviewId);
    setError('');
    try {
      const { review } = await api.replyToReview(shop.slug, reviewId, drafts[reviewId]);
      setReviews((rs) => rs.map((r) => (r.id === reviewId ? { ...r, ownerReply: review.ownerReply } : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
      <p className="text-sm font-semibold mb-3">Reply to reviews</p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {!reviews && !error && <p className="text-sm text-[var(--color-muted-fg)]">Loading…</p>}
      {reviews?.length === 0 && <p className="text-sm text-[var(--color-muted-fg)]">No reviews yet.</p>}
      <div className="flex flex-col gap-4">
        {reviews?.map((r) => (
          <div key={r.id} className="border-b border-[var(--color-border)] pb-4 last:border-0">
            <p className="text-sm font-semibold">{r.authorName} <span className="text-[var(--color-accent)] font-normal">· {'★'.repeat(r.rating)}</span></p>
            <p className="text-sm text-[var(--color-muted-fg)] mt-1">{r.text}</p>
            <textarea
              rows={2}
              value={drafts[r.id] ?? ''}
              onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
              placeholder="Write a public reply…"
              className="w-full mt-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              disabled={savingId === r.id}
              onClick={() => saveReply(r.id)}
              className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-xs disabled:opacity-60"
            >
              {savingId === r.id ? 'Saving…' : 'Save reply'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
