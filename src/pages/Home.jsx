import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const FEEDBACK_BANNER_KEY = 'beantrip:feedback-banner-dismissed';

// London's original filename got cached by the CDN with a bad response
// before the real photo was uploaded, and that cache key won't clear --
// renamed to a fresh, never-poisoned filename instead of waiting it out.
const CITY_IMAGE_OVERRIDES = { London: 'london-photo' };

export default function Home() {
  const { shops, cities, loading } = useShops();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showFeedbackBanner, setShowFeedbackBanner] = useState(
    () => localStorage.getItem(FEEDBACK_BANNER_KEY) !== 'true'
  );

  const dismissFeedbackBanner = () => {
    localStorage.setItem(FEEDBACK_BANNER_KEY, 'true');
    setShowFeedbackBanner(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.accountType === 'business' && user.onboardingSeen) {
      navigate('/my-shop', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const cityCount = (city) => shops.filter((s) => s.city === city).length;

  // The grid always shows exactly 5 tiles (1 big + 4 small) no matter how
  // many cities exist -- "See all cities" is the permanent escape hatch, so
  // this never needs revisiting as more cities get added.
  const FEATURED_CITY_LIMIT = 5;
  const featuredCities = [...cities]
    .sort((a, b) => cityCount(b) - cityCount(a))
    .slice(0, FEATURED_CITY_LIMIT);

  if (loading || (user?.accountType === 'business' && user.onboardingSeen)) {
    return <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 text-center text-[var(--color-muted-fg)]">{t('home.loading')}</div>;
  }

  return (
    <>
      {showFeedbackBanner && (
        <div className="bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-2.5 flex items-center justify-between gap-4 text-sm">
            <p className="font-medium">
              {t('home.feedbackBannerPrefix')}{' '}
              <Link to="/feedback" className="underline underline-offset-2 hover:opacity-80">{t('home.feedbackBannerLink')}</Link>.
            </p>
            <button
              onClick={dismissFeedbackBanner}
              aria-label="Dismiss"
              className="shrink-0 opacity-70 hover:opacity-100 text-base leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-16 sm:pt-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="uppercase tracking-[0.15em] text-xs font-semibold text-[var(--color-accent)] mb-2">
              {shops.length}+ {t('home.statShops')} &middot; {cities.length} {t('home.statCities')}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              {t('home.title')}
            </h1>
          </div>
          <Link to="/explore" className="text-sm font-semibold text-[var(--color-accent)] hover:underline shrink-0">
            {t('home.viewAllCities')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 md:h-[560px]">
          {featuredCities.map((city, i) => (
            <Link
              key={city}
              to={`/explore/${city.toLowerCase()}`}
              className={`group relative rounded-2xl overflow-hidden h-52 md:h-full flex items-end p-5 border border-[var(--color-border)] hover:shadow-lg transition-shadow ${
                i === 0 ? 'md:row-span-2' : ''
              }`}
            >
              <img
                src={`/images/cities/${CITY_IMAGE_OVERRIDES[city] || city.toLowerCase()}.jpg`}
                alt={city}
                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)' }} />
              <div className="relative text-white">
                <p className={`font-display font-semibold ${i === 0 ? 'text-2xl' : 'text-lg'}`}>{city}</p>
                <p className="text-xs opacity-80 mt-0.5">{cityCount(city)} {t('home.spots')}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
