import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { useShops } from '../context/ShopsContext';
import PageMeta from '../components/PageMeta';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function ChipGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            value === o.value
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]'
              : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Feedback() {
  const { t } = useLanguage();
  const { cities } = useShops();
  const CATEGORIES = [
    { value: 'idea', label: t('feedback.categoryIdea') },
    { value: 'bug', label: t('feedback.categoryBug') },
    { value: 'general', label: t('feedback.categoryGeneral') },
  ];
  const MISSING_OPTIONS = [
    { value: 'cities', label: t('feedback.missingCities') },
    { value: 'details', label: t('feedback.missingDetails') },
    { value: 'search', label: t('feedback.missingSearch') },
    { value: 'social', label: t('feedback.missingSocial') },
    { value: 'other', label: t('feedback.missingOther') },
  ];
  const FREQUENCY_OPTIONS = [
    { value: 'daily', label: t('feedback.frequencyDaily') },
    { value: 'few-week', label: t('feedback.frequencyFewWeek') },
    { value: 'weekly', label: t('feedback.frequencyWeekly') },
    { value: 'rarely', label: t('feedback.frequencyRarely') },
  ];
  const CITY_OPTIONS = [
    ...cities.map((c) => ({ value: c, label: c })),
    { value: 'other', label: t('feedback.cityOther') },
  ];
  const FEATURE_OPTIONS = [
    { value: 'explore', label: t('nav.explore') },
    { value: 'map', label: t('nav.map') },
    { value: 'nearMe', label: t('nav.nearMe') },
    { value: 'passport', label: t('nav.passport') },
    { value: 'news', label: t('nav.news') },
    { value: 'events', label: t('nav.events') },
    { value: 'gear', label: t('nav.gear') },
  ];
  const RECOMMEND_OPTIONS = [
    { value: 'yes', label: t('feedback.recommendYes') },
    { value: 'maybe', label: t('feedback.recommendMaybe') },
    { value: 'no', label: t('feedback.recommendNo') },
  ];
  const PREMIUM_OPTIONS = [
    { value: 'yes', label: t('feedback.premiumYes') },
    { value: 'maybe', label: t('feedback.premiumMaybe') },
    { value: 'no', label: t('feedback.premiumNo') },
  ];
  const [category, setCategory] = useState('idea');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [missing, setMissing] = useState(null);
  const [frequency, setFrequency] = useState(null);
  const [city, setCity] = useState(null);
  const [feature, setFeature] = useState(null);
  const [mustHave, setMustHave] = useState(null);
  const [recommend, setRecommend] = useState(null);
  const [premium, setPremium] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [shipped, setShipped] = useState(null);

  useEffect(() => {
    api.shippedFeedback().then(({ items }) => setShipped(items)).catch(() => setShipped([]));
  }, []);

  const composeMessage = () => {
    const parts = [];
    const add = (labelKey, options, value) => {
      const label = options.find((o) => o.value === value)?.label;
      if (label) parts.push(`${t(labelKey)} ${label}`);
    };
    add('feedback.missingLabel', MISSING_OPTIONS, missing);
    add('feedback.frequencyLabel', FREQUENCY_OPTIONS, frequency);
    add('feedback.cityLabel', CITY_OPTIONS, city);
    add('feedback.featureLabel', FEATURE_OPTIONS, feature);
    add('feedback.mustHaveLabel', FEATURE_OPTIONS, mustHave);
    add('feedback.recommendLabel', RECOMMEND_OPTIONS, recommend);
    add('feedback.premiumLabel', PREMIUM_OPTIONS, premium);
    if (message.trim()) parts.push(message.trim());
    return parts.join('\n');
  };

  const composedMessage = composeMessage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!composedMessage) return;
    setError('');
    setSubmitting(true);
    try {
      await api.submitFeedback({ category, rating: rating || null, message: composedMessage });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-5 sm:px-8 py-24 text-center">
        <p className="text-4xl mb-4">☕🙏</p>
        <p className="font-display text-2xl mb-3">{t('feedback.thanksTitle')}</p>
        <p className="text-sm text-[var(--color-muted-fg)]">
          {t('feedback.thanksBody')}
        </p>
        <Link to="/" className="inline-block mt-6 text-[var(--color-accent)] font-semibold hover:underline">{t('feedback.backHome')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-8 py-12">
      <PageMeta
        title="Feedback \u2014 Beantrip"
        description="Tell us what would make Beantrip more useful. Beantrip is still being built and every note helps."
        canonical="/feedback"
      />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold">{t('feedback.title')}</h1>
      <p className="text-[var(--color-muted-fg)] mt-2">
        {t('feedback.subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <div>
          <span className="text-sm font-medium">{t('feedback.whatAbout')}</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  category === c.value
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-card)]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.ratingLabel')} <span className="text-[var(--color-muted-fg)] font-normal">{t('feedback.optional')}</span></span>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? 0 : n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${n} out of 5`}
                className="text-3xl leading-none transition-transform hover:scale-110"
              >
                {(hoverRating || rating) >= n ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.missingLabel')}</span>
          <ChipGroup options={MISSING_OPTIONS} value={missing} onChange={setMissing} />
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.frequencyLabel')}</span>
          <ChipGroup options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.cityLabel')}</span>
          <ChipGroup options={CITY_OPTIONS} value={city} onChange={setCity} />
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.featureLabel')}</span>
          <ChipGroup options={FEATURE_OPTIONS} value={feature} onChange={setFeature} />
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.mustHaveLabel')}</span>
          <ChipGroup options={FEATURE_OPTIONS} value={mustHave} onChange={setMustHave} />
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.recommendLabel')}</span>
          <ChipGroup options={RECOMMEND_OPTIONS} value={recommend} onChange={setRecommend} />
        </div>

        <div>
          <span className="text-sm font-medium">{t('feedback.premiumLabel')}</span>
          <ChipGroup options={PREMIUM_OPTIONS} value={premium} onChange={setPremium} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t('feedback.messageLabel')} <span className="text-[var(--color-muted-fg)] font-normal">{t('feedback.optional')}</span></span>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedback.messagePlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting || !composedMessage}
          type="submit"
          className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? t('feedback.sending') : t('feedback.send')}
        </button>
      </form>

      {shipped?.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-xl font-semibold">{t('feedback.shippedTitle')}</h2>
          <p className="text-sm text-[var(--color-muted-fg)] mt-1">{t('feedback.shippedSubtitle')}</p>
          <ul className="mt-4 flex flex-col gap-3">
            {shipped.map((item) => (
              <li key={item.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3">
                <p className="text-sm">{item.adminNote}</p>
                {item.reviewedAt && <p className="text-xs text-[var(--color-muted-fg)] mt-1">{formatDate(item.reviewedAt)}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
