import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import PhotoGallery from '../components/PhotoGallery';
import PageMeta from '../components/PageMeta';
import { isTopVoted } from '../components/ShopCard';
import { useFavorites } from '../context/FavoritesContext';
import { useVisits } from '../context/VisitsContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const dayKeys = { mon: 'shop.dayMon', tue: 'shop.dayTue', wed: 'shop.dayWed', thu: 'shop.dayThu', fri: 'shop.dayFri', sat: 'shop.daySat', sun: 'shop.daySun' };
const tasteKeys = { bright: 'shop.tasteBright', earthy: 'shop.tasteEarthy' };
const originKeys = {
  ethiopia: 'shop.originEthiopia', colombia: 'shop.originColombia', brazil: 'shop.originBrazil', kenya: 'shop.originKenya',
  guatemala: 'shop.originGuatemala', tanzania: 'shop.originTanzania', jamaica: 'shop.originJamaica',
  'costa-rica': 'shop.originCostaRica', indonesia: 'shop.originIndonesia', yemen: 'shop.originYemen',
};

export default function ShopDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isVisited, toggleVisit } = useVisits();

  const [shop, setShop] = useState(null);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [reviewError, setReviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [userPhotos, setUserPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSubmitted, setPhotoSubmitted] = useState(false);

  const [flaggedIds, setFlaggedIds] = useState(new Set());

  const handleFlag = async (reviewId) => {
    if (!user) return navigate('/auth');
    try {
      await api.flagReview(slug, reviewId);
      setFlaggedIds((ids) => new Set(ids).add(reviewId));
    } catch {
      // already flagged — treat as flagged either way
      setFlaggedIds((ids) => new Set(ids).add(reviewId));
    }
  };

  const loadShop = () => {
    api.getShop(slug)
      .then(({ shop }) => setShop(shop))
      .catch(() => setNotFound(true));
  };

  const loadReviews = () => {
    api.listReviews(slug).then(({ reviews }) => setReviews(reviews)).catch(() => {});
  };

  const loadUserPhotos = () => {
    api.listShopUserPhotos(slug).then(({ photos }) => setUserPhotos(photos)).catch(() => {});
  };

  useEffect(() => {
    setShop(null);
    setNotFound(false);
    setPhotoSubmitted(false);
    loadShop();
    loadReviews();
    loadUserPhotos();
    api.trackShopEvent(slug, 'view').catch(() => {});
  }, [slug]);

  // QR check-in: scanning a shop's code lands here with ?checkin=1 -- mark
  // it visited automatically instead of making the user tap again. Anyone
  // not signed in yet keeps the param (so signing in and coming back still
  // completes the check-in) until it's actually acted on.
  const pendingCheckIn = searchParams.get('checkin') === '1';
  useEffect(() => {
    if (!shop || !user || !pendingCheckIn) return;
    if (!isVisited(shop.id)) {
      toggleVisit(shop.id);
      setJustCheckedIn(true);
    }
    setSearchParams((params) => {
      params.delete('checkin');
      return params;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, user, pendingCheckIn]);

  const trackClick = (target) => () => {
    api.trackShopEvent(slug, 'click', target).catch(() => {});
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      await api.uploadShopUserPhoto(slug, file);
      setPhotoSubmitted(true);
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 text-center">
        <p className="font-display text-2xl mb-3">{t('shop.notFound')}</p>
        <Link to="/explore" className="text-[var(--color-accent)] font-semibold hover:underline">
          {t('shop.backToExploreLink')}
        </Link>
      </div>
    );
  }

  if (!shop) {
    return <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 text-center text-[var(--color-muted-fg)]">Loading…</div>;
  }

  const fav = isFavorite(shop.id);
  const visited = isVisited(shop.id);

  const handleFavoriteClick = () => {
    if (!user) return navigate('/auth');
    toggleFavorite(shop.id);
  };

  const handleVisitClick = () => {
    if (!user) return navigate('/auth');
    toggleVisit(shop.id);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    setSubmitting(true);
    try {
      await api.addReview(slug, Number(reviewForm.rating), reviewForm.text);
      setReviewForm({ rating: 5, text: '' });
      loadReviews();
      loadShop();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const metaDescription = shop.description
    ? shop.description.slice(0, 160)
    : `${shop.name} — specialty coffee in ${shop.neighborhood ? `${shop.neighborhood}, ` : ''}${shop.city}.`;
  // Shops with more than one branch under the same name in the same city are
  // slugged -2, -3. Without something to tell them apart those pages all carry
  // the same title. scripts/prerender.js uses this same rule, so the title we
  // serve and the title we render match.
  const branchLocator =
    shop.neighborhood && !shop.name.toLowerCase().includes(shop.neighborhood.toLowerCase())
      ? shop.neighborhood
      : (shop.address || '')
          .split(',')[0]
          .trim()
          .replace(/^\d+[A-Za-z]?[\s-]+/, '')
          .replace(/\s+\d+[A-Za-z]?$/, '') || null;
  const metaTitle =
    /-\d+$/.test(shop.slug) && branchLocator
      ? `${shop.name} \u2014 ${branchLocator} \u2014 Specialty Coffee Shop in ${shop.city} | Beantrip`
      : `${shop.name} \u2014 Specialty Coffee Shop in ${shop.city} | Beantrip`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: shop.name,
    image: shop.image ? `https://beantrip.com${shop.image}` : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address,
      addressLocality: shop.city,
    },
    ...(shop.lat != null && shop.lng != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: shop.lat, longitude: shop.lng } }
      : {}),
    ...(shop.rating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: shop.rating, reviewCount: shop.reviewCount } }
      : {}),
    ...(shop.website ? { url: shop.website } : {}),
  };
  const structuredDataJson = JSON.stringify(structuredData).replace(/</g, '\\u003c');

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <PageMeta title={metaTitle} description={metaDescription} canonical={`/shop/${shop.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataJson }} />

      <Link to={`/explore/${shop.city.toLowerCase()}`} className="text-sm font-semibold text-[var(--color-accent)] hover:underline">
        {t('shop.backToCity')} {shop.city}
      </Link>

      {justCheckedIn && (
        <div className="mt-4 bg-[var(--color-accent)] text-[var(--color-accent-fg)] rounded-xl px-4 py-3 text-sm font-semibold">
          ✓ Checked in at {shop.name}
        </div>
      )}
      {pendingCheckIn && !user && (
        <div className="mt-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm">
          <Link to="/auth" className="text-[var(--color-accent)] font-semibold hover:underline">Sign in</Link> to save this check-in.
        </div>
      )}

      <PhotoGallery shop={shop} className="w-full h-56 sm:h-72 rounded-2xl mt-4" priority />

      <div className="flex items-start justify-between gap-4 mt-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">{shop.name}</h1>
          {isTopVoted(shop) && (
            <span className="inline-block mt-2 text-xs font-semibold uppercase tracking-wide bg-[var(--color-primary)] text-[var(--color-primary-fg)] px-3 py-1 rounded-full">
              {t('shop.topVoted')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={handleFavoriteClick}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              fav
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
            }`}
          >
            {fav ? `♥ ${t('shop.saved')}` : `♡ ${t('shop.save')}`}
          </button>
          <button
            onClick={handleVisitClick}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              visited
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] border-[var(--color-accent)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
            }`}
          >
            {visited ? `✓ ${t('shop.visited')}` : t('shop.beenHere')}
          </button>
        </div>
      </div>
      <p className="text-[var(--color-muted-fg)] mt-1">{shop.address}</p>
      <p className="text-sm text-[var(--color-muted-fg)] mt-1">
        {shop.rating > 0 ? `★ ${shop.rating.toFixed(1)}` : '—'} ({shop.reviewCount} {t('shop.reviews')})
        {shop.neighborhood && <span className="text-[var(--color-accent)] font-medium"> · {shop.neighborhood}</span>}
        {shop.beansInStock != null && (
          <span className={shop.beansInStock ? 'text-[var(--color-accent)] font-medium' : 'text-red-500 font-medium'}>
            {' '}· {shop.beansInStock ? t('shop.beansInStock') : t('shop.beansOutOfStock')}
          </span>
        )}
      </p>

      {shop.placeholder ? (
        <p className="mt-5 text-sm italic text-[var(--color-muted-fg)] bg-[var(--color-card)] rounded-xl px-4 py-3">
          {t('shop.placeholderNotice')}
        </p>
      ) : (
        <p className="mt-5 text-base leading-relaxed">{shop.description}</p>
      )}

      {shop.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {shop.tags.map((tag) => (
            <span key={tag} className="text-xs uppercase tracking-wide bg-[var(--color-border)] text-[var(--color-muted-fg)] px-3 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {(shop.espressoMachine || shop.beanType || shop.taste || shop.originCountry) && (
        <p className="text-sm text-[var(--color-muted-fg)] mt-4">
          {[
            shop.espressoMachine && <>{t('shop.espressoMachine')} <span className="text-[var(--color-fg)]">{shop.espressoMachine}</span></>,
            shop.beanType && <>{t('shop.beans')} <span className="text-[var(--color-fg)] capitalize">{shop.beanType}</span></>,
            shop.taste && <>{t('shop.taste')} <span className="text-[var(--color-fg)]">{t(tasteKeys[shop.taste])}</span></>,
            shop.originCountry && <>{t('shop.origin')} <span className="text-[var(--color-fg)]">{t(originKeys[shop.originCountry])}</span></>,
          ].filter(Boolean).map((part, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {part}
            </span>
          ))}
        </p>
      )}

      {shop.beans?.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold">{t('shop.beansHeading')}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {shop.beans.map((b) => (
              <span key={b.id} className="text-sm bg-[var(--color-card)] border border-[var(--color-border)] rounded-full px-3 py-1.5">
                {b.name}
                {(b.roast || b.origin) && (
                  <span className="text-[var(--color-muted-fg)] capitalize"> · {[b.roast, b.origin?.replace('-', ' ')].filter(Boolean).join(' · ')}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-6">
        <a
          href={
            shop.lat && shop.lng
              ? `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.address}, ${shop.city}`)}`
          }
          target="_blank"
          rel="noreferrer"
          onClick={trackClick('directions')}
          className="px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          {t('shop.directions')}
        </a>
        {shop.website && (
          <a href={shop.website} target="_blank" rel="noreferrer" onClick={trackClick('website')} className="text-sm font-semibold text-[var(--color-accent)] hover:underline">
            {t('shop.website')}
          </a>
        )}
        {shop.instagram && (
          <a href={shop.instagram} target="_blank" rel="noreferrer" onClick={trackClick('instagram')} className="text-sm font-semibold text-[var(--color-accent)] hover:underline">
            {t('shop.instagram')}
          </a>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] mt-10 pt-8">
        <h2 className="font-display text-xl font-semibold mb-3">{t('shop.visitorPhotos')}</h2>

        {user ? (
          <div className="mb-4">
            <label className="inline-block text-sm font-semibold text-[var(--color-accent)] hover:underline cursor-pointer">
              {uploadingPhoto ? t('shop.uploading') : t('shop.addPhoto')}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="hidden" />
            </label>
            <p className="text-xs text-[var(--color-muted-fg)] mt-1">{t('shop.photoHint')}</p>
            {photoSubmitted && <p className="text-sm text-[var(--color-accent)] font-semibold mt-2">{t('shop.photoQueued')}</p>}
            {photoError && <p className="text-sm text-red-600 mt-2">{photoError}</p>}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-fg)] mb-4">
            <Link to="/auth" className="text-[var(--color-accent)] font-semibold hover:underline">{t('auth.signIn')}</Link> {t('shop.signInToAddPhoto')}
          </p>
        )}

        {userPhotos.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {userPhotos.map((p) => (
              <img key={p.id} src={p.storageUrl} alt={shop.name} className="w-24 h-24 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] mt-10 pt-8">
        <h2 className="font-display text-xl font-semibold mb-3">{t('shop.reviewsHeading')}</h2>

        {user ? (
          <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3 mb-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              {t('shop.rating')}
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm((f) => ({ ...f, rating: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </label>
            <textarea
              required
              rows={3}
              placeholder={t('shop.shareExperience')}
              value={reviewForm.text}
              onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
            <button
              disabled={submitting}
              className="self-start px-5 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm disabled:opacity-60"
            >
              {submitting ? t('shop.posting') : t('shop.postReview')}
            </button>
          </form>
        ) : (
          <p className="text-sm text-[var(--color-muted-fg)] mb-6">
            <Link to="/auth" className="text-[var(--color-accent)] font-semibold hover:underline">{t('auth.signIn')}</Link> {t('shop.signInToReview')}
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-fg)]">{t('shop.noReviewsYet')}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-[var(--color-border)] pb-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{r.authorName} <span className="text-[var(--color-accent)] font-normal">· {'★'.repeat(r.rating)}</span></p>
                  <button
                    onClick={() => handleFlag(r.id)}
                    disabled={flaggedIds.has(r.id)}
                    className="text-xs text-[var(--color-muted-fg)] hover:text-[var(--color-accent)] disabled:hover:text-[var(--color-muted-fg)] shrink-0"
                  >
                    {flaggedIds.has(r.id) ? t('shop.flagged') : t('shop.flag')}
                  </button>
                </div>
                <p className="text-sm text-[var(--color-muted-fg)] mt-1">{r.text}</p>
                {r.ownerReply && (
                  <div className="mt-3 ml-4 pl-3 border-l-2 border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-accent)]">{t('shop.responseFrom')} {shop.name}</p>
                    <p className="text-sm text-[var(--color-muted-fg)] mt-1">{r.ownerReply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {shop.hours && (
        <div className="border-t border-[var(--color-border)] mt-8 pt-8">
          <h2 className="font-display text-xl font-semibold mb-3">{t('shop.openingHours')}</h2>
          <dl className="text-sm divide-y divide-[var(--color-border)]">
            {Object.entries(shop.hours).map(([day, val]) => (
              <div key={day} className="flex justify-between py-1.5">
                <dt className="font-medium">{t(dayKeys[day])}</dt>
                <dd className="text-[var(--color-muted-fg)]">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
