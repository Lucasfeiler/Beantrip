import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShops } from '../context/ShopsContext';
import { useLanguage } from '../context/LanguageContext';
import ShopCard from '../components/ShopCard';
import PageMeta from '../components/PageMeta';

const ROAST_TAGS = ['light', 'medium', 'dark'];
const BREW_TAGS = ['espresso', 'pour-over', 'cold-brew', 'french-press', 'aeropress', 'filter', 'ristretto', 'macchiato', 'flat-white', 'cappuccino'];
const VIBE_TAGS = ['lively', 'modern', 'minimalist'];

function TagGroup({ label, tags, selected, onToggle }) {
  if (tags.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-muted-fg)] uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition-colors ${
              selected.includes(tag)
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg)]'
            }`}
          >
            {tag.replace('-', ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Explore() {
  const { shops, cities, allTags, loading } = useShops();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { citySlug } = useParams();
  const [params] = useSearchParams();
  const legacyCityParam = params.get('city') || '';

  // The real, correctly-capitalized city name matching the slug in the URL
  // path (case-insensitive), e.g. "munich" -> "Munich".
  const cityParam = citySlug
    ? cities.find((c) => c.toLowerCase() === citySlug.toLowerCase()) || ''
    : legacyCityParam;

  // Old ?city=X links redirect to the canonical /explore/x path so there's
  // only ever one indexable URL per city.
  useEffect(() => {
    if (!citySlug && legacyCityParam) {
      navigate(`/explore/${legacyCityParam.toLowerCase()}`, { replace: true });
    }
  }, [citySlug, legacyCityParam, navigate]);

  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState('');

  const toggleTag = (tag) => {
    setSelectedTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  };

  const otherTags = allTags.filter((t) => !ROAST_TAGS.includes(t) && !BREW_TAGS.includes(t) && !VIBE_TAGS.includes(t));

  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  const filtered = useMemo(() => {
    const result = shops.filter((s) => {
      if (cityParam && s.city !== cityParam) return false;
      if (selectedTags.length > 0 && !selectedTags.every((tag) => s.tags?.includes(tag))) return false;
      if (query && !`${s.name} ${s.neighborhood} ${s.address} ${(s.tags ?? []).join(' ')} ${s.description ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (openNow && !(s.hours && s.hours[todayKey])) return false;
      return true;
    });

    if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else if (sortBy === 'reviews') {
      result.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [shops, cityParam, selectedTags, query, openNow, todayKey, sortBy]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 text-center text-[var(--color-muted-fg)]">{t('explore.loading')}</div>;
  }

  const cityShops = cityParam ? shops.filter((s) => s.city === cityParam) : [];
  const cityCount = cityShops.length;

  // Top neighborhoods by shop count, for real per-city intro copy instead
  // of a generic sentence with a number swapped in.
  const cityNeighborhoods = cityParam
    ? Object.entries(
        cityShops.reduce((acc, s) => {
          if (s.neighborhood) acc[s.neighborhood] = (acc[s.neighborhood] ?? 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name]) => name)
    : [];

  function formatList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  }

  const pageTitle = cityParam
    ? `Specialty Coffee in ${cityParam} — Beantrip`
    : 'Explore the Coffee Scene — Beantrip';
  const pageDescription = cityParam
    ? `Discover ${cityCount} specialty coffee shops in ${cityParam}. Browse reviews, filter by roast type and brewing method, and find your next favorite spot.`
    : t('explore.subtitle');
  const introText = cityParam
    ? cityNeighborhoods.length > 0
      ? `${cityCount} specialty coffee shops across ${cityParam}, including spots in ${formatList(cityNeighborhoods)}. Filter by roast type, brewing method, or vibe to find your next favorite.`
      : pageDescription
    : pageDescription;

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        canonical={cityParam ? `/explore/${cityParam.toLowerCase()}` : '/explore'}
      />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold">
        {cityParam ? `Specialty Coffee in ${cityParam}` : t('explore.title')}
      </h1>
      <p className="text-[var(--color-muted-fg)] mt-2">{introText}</p>

      {cityParam === 'Munich' && (
        <Link
          to="/guides/best-coffee-shops-munich"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)] hover:underline"
        >
          Read our guide: Best Coffee Shops in Munich (2026) →
        </Link>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <input
          type="text"
          placeholder={t('explore.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-96 px-4 py-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOpenNow((v) => !v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              openNow
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
            }`}
          >
            {t('explore.openNow')}
          </button>

          <select
            value={cityParam}
            onChange={(e) => {
              const v = e.target.value;
              navigate(v ? `/explore/${v.toLowerCase()}` : '/explore');
            }}
            className="px-4 py-1.5 rounded-full text-sm font-medium border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none"
          >
            <option value="">{t('explore.allCities')}</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none"
          >
            <option value="">{t('explore.sortRelevance')}</option>
            <option value="rating">{t('explore.sortRating')}</option>
            <option value="reviews">{t('explore.sortReviews')}</option>
            <option value="name">{t('explore.sortName')}</option>
          </select>

          {(selectedTags.length > 0 || query || openNow) && (
            <button
              type="button"
              onClick={() => { setSelectedTags([]); setQuery(''); setOpenNow(false); }}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              {t('explore.clearFilters')}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <TagGroup label={t('explore.roastLabel')} tags={ROAST_TAGS.filter((t) => allTags.includes(t))} selected={selectedTags} onToggle={toggleTag} />
          <TagGroup label={t('explore.brewLabel')} tags={BREW_TAGS.filter((t) => allTags.includes(t))} selected={selectedTags} onToggle={toggleTag} />
          <TagGroup label={t('explore.vibeLabel')} tags={VIBE_TAGS.filter((t) => allTags.includes(t))} selected={selectedTags} onToggle={toggleTag} />
          <TagGroup label={t('explore.otherLabel')} tags={otherTags} selected={selectedTags} onToggle={toggleTag} />
        </div>
      </div>

      <p className="mt-6 text-sm text-[var(--color-muted-fg)]">{filtered.length} {t('explore.shopsFound')}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
        {filtered.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-[var(--color-muted-fg)]">
          <p className="font-display text-xl mb-2">{t('explore.noMatchTitle')}</p>
          <p className="text-sm">{t('explore.noMatchSubtitle')}</p>
        </div>
      )}
    </div>
  );
}
