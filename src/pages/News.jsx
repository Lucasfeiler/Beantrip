import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import PageMeta from '../components/PageMeta';

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function News() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listArticles()
      .then(({ articles }) => setArticles(articles))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <PageMeta
        title="Coffee News — Beantrip"
        description="Stories, updates, and expert commentary from the specialty coffee world, curated by Beantrip."
        canonical="/news"
      />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold">News</h1>
      <p className="text-[var(--color-muted-fg)] mt-1">Stories, updates, and expert commentary from the coffee world.</p>

      {error && <p className="text-sm text-red-600 mt-6">{error}</p>}

      {articles === null ? (
        <p className="text-sm text-[var(--color-muted-fg)] mt-8">Loading…</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-fg)] mt-8">No articles yet — check back soon.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {articles.map((a) => (
            <Link
              key={a.slug}
              to={`/news/${a.slug}`}
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all"
            >
              {a.coverImage && (
                <img src={a.coverImage} alt={a.title} className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-display font-semibold text-base leading-snug">{a.title}</h3>
                {a.excerpt && <p className="text-sm text-[var(--color-muted-fg)] mt-2 line-clamp-2">{a.excerpt}</p>}
                <p className="text-xs text-[var(--color-muted-fg)] mt-3">{formatDate(a.publishedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
