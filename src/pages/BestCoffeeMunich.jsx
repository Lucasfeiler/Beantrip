import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta';
import { YEAR, PICKS } from '../data/best-coffee-munich';

export default function BestCoffeeMunich() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best Coffee Shops in Munich (${YEAR})`,
    itemListElement: PICKS.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://beantrip.com/shop/${p.slug}`,
      name: p.name,
    })),
  };
  const structuredDataJson = JSON.stringify(structuredData).replace(/</g, '\\u003c');

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <PageMeta
        title={`Best Coffee Shops in Munich (${YEAR}) | Beantrip`}
        description={`Our pick of ${PICKS.length} standout specialty coffee shops across Munich — from Glockenbach to Altstadt to Schwabing — with real ratings and what makes each one worth the visit.`}
        canonical="/guides/best-coffee-shops-munich"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataJson }} />

      <Link to="/explore/munich" className="text-sm font-semibold text-[var(--color-accent)] hover:underline">
        ← Back to all Munich shops
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-4">
        The Best Coffee Shops in Munich ({YEAR})
      </h1>
      <p className="text-[var(--color-muted-fg)] mt-3 leading-relaxed">
        Munich's specialty coffee scene is spread across the city — a working roastery in Glockenbach,
        a stall at Viktualienmarkt that's been going since 1995, a coffee-and-bookstore hybrid in
        Schwabing. We picked {PICKS.length} that stand out, drawing on real ratings and review counts
        rather than just alphabetical order. Ratings below are Google's, not ours — Beantrip's own
        review system is newer and still building up real user reviews.
      </p>

      <ol className="mt-8 flex flex-col gap-6">
        {PICKS.map((p, i) => (
          <li key={p.slug} className="border-b border-[var(--color-border)] pb-6 last:border-0">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                <span className="text-[var(--color-accent)] mr-2">{i + 1}.</span>
                <Link to={`/shop/${p.slug}`} className="hover:underline">{p.name}</Link>
              </h2>
              <span className="text-sm text-[var(--color-muted-fg)] shrink-0">
                ★ {p.rating.toFixed(1)} <span className="text-xs">({p.reviews.toLocaleString()} on Google)</span>
              </span>
            </div>
            <p className="text-xs text-[var(--color-accent)] font-medium mt-0.5">{p.neighborhood}</p>
            <p className="text-sm text-[var(--color-muted-fg)] mt-2 leading-relaxed">{p.blurb}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
        <p className="text-sm">
          This is a starting point, not the full picture — Munich has 90+ specialty coffee shops on
          Beantrip.{' '}
          <Link to="/explore/munich" className="text-[var(--color-accent)] font-semibold hover:underline">
            Browse all of them by neighborhood, roast, and brewing method →
          </Link>
        </p>
      </div>
    </div>
  );
}
