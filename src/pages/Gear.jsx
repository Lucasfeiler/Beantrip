import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import PageMeta from '../components/PageMeta';

export default function Gear() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listGear()
      .then(({ items }) => setItems(items))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <PageMeta
        title="Coffee Gear We Love — Beantrip"
        description="Coffee equipment, brewers, and beans recommended by Beantrip for specialty coffee lovers."
        canonical="/gear"
      />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold">Gear We Love</h1>
      <p className="text-[var(--color-muted-fg)] mt-1">Coffee equipment and beans we recommend.</p>

      {error && <p className="text-sm text-red-600 mt-6">{error}</p>}

      {items === null ? (
        <p className="text-sm text-[var(--color-muted-fg)] mt-8">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-fg)] mt-8">Nothing here yet — check back soon.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {items.map((item) => (
            <a
              key={item.slug}
              href={item.affiliateUrl}
              target="_blank"
              rel="noreferrer sponsored"
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all"
            >
              {item.image && (
                <img src={item.image} alt={item.title} className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-display font-semibold text-base leading-snug">{item.title}</h3>
                {item.description && <p className="text-sm text-[var(--color-muted-fg)] mt-2 line-clamp-2">{item.description}</p>}
                <p className="text-xs font-semibold text-[var(--color-accent)] mt-3">Shop now ↗</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
