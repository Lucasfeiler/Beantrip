import { useEffect } from 'react';

// Overrides the site-wide <meta name="description"> in place instead of
// rendering a second one -- React doesn't dedupe meta tags across separate
// component trees, so two instances would otherwise both stay in the DOM.
export default function PageMeta({ title, description, canonical }) {
  useEffect(() => {
    if (!description) return;
    const el = document.querySelector('meta[name="description"]');
    if (!el) return;
    const previous = el.getAttribute('content');
    el.setAttribute('content', description);
    return () => el.setAttribute('content', previous);
  }, [description]);

  return (
    <>
      {title && <title>{title}</title>}
      {canonical && <link rel="canonical" href={`https://beantrip.com${canonical}`} />}
    </>
  );
}
