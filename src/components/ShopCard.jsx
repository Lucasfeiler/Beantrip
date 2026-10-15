import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PhotoGallery from './PhotoGallery';

export function isTopVoted(shop) {
  return shop.rating >= 4.5 && shop.reviewCount >= 3;
}

function beanGlyph(seed) {
  // deterministic subtle rotation/hue per shop for the placeholder art
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function ShopThumb({ shop, className = '' }) {
  const { t } = useLanguage();
  const hue = beanGlyph(shop.slug);

  if (shop.image) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={shop.image}
          alt={shop.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {shop.placeholder && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-card)]/90 text-[var(--color-fg)] px-2 py-0.5 rounded-full">
            {t('card.needsDetails')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 45%, 88%), hsl(${(hue + 40) % 360}, 55%, 78%))`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute -bottom-4 -right-4 w-2/3 h-2/3 opacity-40"
        style={{ color: `hsl(${hue}, 40%, 30%)` }}
      >
        <path
          fill="currentColor"
          d="M50 10c-18 0-32 16-32 36s14 44 32 44 32-24 32-44S68 10 50 10zm0 6c1 8-6 16-6 30s7 22 6 30c-14-2-24-18-24-38s10-30 24-22z"
        />
      </svg>
      {shop.placeholder && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-card)]/90 text-[var(--color-fg)] px-2 py-0.5 rounded-full">
          {t('card.needsDetails')}
        </span>
      )}
    </div>
  );
}

function formatDistance(meters) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function ShopCard({ shop, distanceMeters }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fav = isFavorite(shop.id);

  const handleFavoriteClick = () => {
    if (!user) return navigate('/auth');
    toggleFavorite(shop.id);
  };

  return (
    <div className="group relative bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all">
      <Link to={`/shop/${shop.slug}`}>
        <PhotoGallery shop={shop} className="h-36 w-full" />
      </Link>
      {distanceMeters != null && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-card)]/90 text-[var(--color-fg)] px-2 py-1 rounded-full">
          {formatDistance(distanceMeters)}
        </span>
      )}
      <button
        onClick={handleFavoriteClick}
        aria-label={fav ? t('card.removeFavorite') : t('card.saveFavorite')}
        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
          fav ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]' : 'bg-[var(--color-card)]/90 text-[var(--color-fg)] hover:bg-[var(--color-card)]'
        }`}
      >
        {fav ? '♥' : '♡'}
      </button>
      <Link to={`/shop/${shop.slug}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-base leading-snug">{shop.name}</h3>
          {isTopVoted(shop) && (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-primary)] text-[var(--color-primary-fg)] px-2 py-1 rounded-full">
              {t('shop.topVoted')}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-muted-fg)] mt-1">
          {shop.rating > 0 ? `★ ${shop.rating.toFixed(1)}` : '—'} ({shop.reviewCount} {t('shop.reviews')})
        </p>
        <p className="text-sm text-[var(--color-muted-fg)] mt-2 line-clamp-2">
          {shop.address}
        </p>
        {shop.neighborhood && (
          <p className="text-xs text-[var(--color-accent)] font-medium mt-1">{shop.neighborhood}</p>
        )}
        {shop.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {shop.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] uppercase tracking-wide bg-[var(--color-border)] text-[var(--color-muted-fg)] px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
            {shop.tags.length > 4 && (
              <span className="text-[10px] uppercase tracking-wide text-[var(--color-muted-fg)] px-2 py-1">
                {t('card.moreTag')}
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-[var(--color-muted-fg)] mt-3">
          {t('card.today')} {shop.hours ? shop.hours[todayKey()] || '—' : '—'}
        </p>
      </Link>
    </div>
  );
}

function todayKey() {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
}
