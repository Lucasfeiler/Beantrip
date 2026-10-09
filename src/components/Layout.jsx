import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import NotificationPrompt from './NotificationPrompt';
import FeedbackModal from './FeedbackModal';
import QRCheckIn from './QRCheckIn';
import { initAdTracking } from '../lib/adTracking';

const ONBOARDING_EXEMPT_PATHS = ['/onboarding', '/reset-password', '/verify-email'];

const primaryLinks = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/explore', key: 'nav.explore' },
  { to: '/near-me', key: 'nav.nearMe' },
  { to: '/map', key: 'nav.map' },
  { to: '/favorites', key: 'nav.favorites' },
  { to: '/add-shop', key: 'nav.add' },
];

const moreLinks = [
  { to: '/passport', key: 'nav.passport' },
  { to: '/news', key: 'nav.news' },
  { to: '/events', key: 'nav.events' },
  { to: '/gear', key: 'nav.gear' },
  { to: '/feedback', key: 'nav.feedback' },
];

function getPrimaryLinks(user) {
  const links = [...primaryLinks];
  if (user?.accountType === 'business') links.push({ to: '/my-shop', key: 'nav.myShop' });
  if (user?.isAdmin) links.push({ to: '/admin', key: 'nav.admin' });
  return links;
}

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label="Language"
      className="shrink-0 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-card)] transition-colors cursor-pointer focus:outline-none"
    >
      {LANGUAGES.map((l) => (
        <option key={l.value} value={l.value} className="bg-[var(--color-bg)] text-[var(--color-fg)]">
          {l.label}
        </option>
      ))}
    </select>
  );
}

function MoreMenu({ pillClassName }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const location = useLocation();
  const active = moreLinks.some((l) => l.to === location.pathname);

  useEffect(() => {
    function handleClick(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuWidth = 160;
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
      setMenuStyle({ position: 'fixed', top: rect.bottom + 4, left });
    }
    setOpen((o) => !o);
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        className={`${pillClassName} ${
          active ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]' : 'text-[var(--color-muted-fg)] hover:bg-[var(--color-card)]'
        }`}
      >
        {t('nav.more')}
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle} className="w-40 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 z-50">
          {moreLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm transition-colors ${isActive ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-fg)] hover:bg-[var(--color-bg)]'}`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const links = getPrimaryLinks(user);

  useEffect(() => {
    if (loading || !user || user.onboardingSeen) return;
    if (ONBOARDING_EXEMPT_PATHS.includes(location.pathname)) return;
    navigate('/onboarding');
  }, [loading, user, location.pathname, navigate]);

  useEffect(() => {
    initAdTracking();
  }, []);

  // Pages are prerendered at build time, so their title, description, canonical
  // and JSON-LD are already in the document when React mounts. React then adds
  // its own copies, and two canonicals is worse than one.
  //
  // A prerendered tag is only dropped once its replacement is actually there,
  // never before: a page still loading its data has not rendered its meta yet,
  // and removing the prerendered one first would leave the page with no title.
  //
  // Two things make the timing awkward. React hoists title and link tags into
  // head a beat after the commit, and ShopDetail renders its JSON-LD inside the
  // component tree rather than in head. So this sweeps on every render, again on
  // the next frame, and again whenever head changes.
  useEffect(() => {
    function sweep() {
      const dropReplaced = (selector) => {
        const all = [...document.head.querySelectorAll(selector)];
        const stale = all.filter((el) => el.hasAttribute('data-prerendered'));
        if (all.length > stale.length) stale.forEach((el) => el.remove());
      };

      dropReplaced('title');
      dropReplaced('link[rel="canonical"]');
      dropReplaced('meta[name="description"]');

      // JSON-LD is matched by @type across the whole document, since a page can
      // carry several blocks and the app renders its own outside head.
      const byType = new Map();
      document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
        let type;
        try {
          type = JSON.parse(el.textContent)['@type'];
        } catch {
          return;
        }
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type).push(el);
      });
      byType.forEach((nodes) => {
        const stale = nodes.filter((el) => el.hasAttribute('data-prerendered'));
        if (nodes.length > stale.length) stale.forEach((el) => el.remove());
      });
    }

    sweep();
    const frame = requestAnimationFrame(sweep);
    const observer = new MutationObserver(sweep);
    observer.observe(document.head, { childList: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  // The prerendered tags describe the URL the browser actually loaded. Once the
  // app has navigated somewhere else, every one of them is stale, whether or not
  // the new page happens to render a replacement.
  const loadedPath = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === loadedPath.current) return;
    document.querySelectorAll('[data-prerendered]').forEach((el) => el.remove());
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <meta name="description" content="Beantrip helps you discover the world's best specialty coffee shops. Browse reviews, filter by roast type and brewing method, and find your perfect cup." />
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight shrink-0">
            Bean<span className="text-[var(--color-accent)]">trip</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-full transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                      : 'text-[var(--color-muted-fg)] hover:bg-[var(--color-card)]'
                  }`
                }
              >
                {t(l.key)}
              </NavLink>
            ))}
            <MoreMenu pillClassName="px-3 py-2 rounded-full text-sm font-medium transition-colors" />
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="text-sm font-semibold px-4 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-card)] transition-colors"
                >
                  {user.name}
                </Link>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="text-sm font-semibold px-4 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-card)] transition-colors"
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="text-sm font-semibold px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:opacity-90 transition-opacity shrink-0"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
        <nav className="sm:hidden flex items-center gap-1 px-5 pb-3 text-sm font-medium overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                    : 'text-[var(--color-muted-fg)] hover:bg-[var(--color-card)]'
                }`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
          <MoreMenu pillClassName="px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors" />
          <LanguageToggle />
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <FeedbackModal />
      <NotificationPrompt />
      <QRCheckIn />

      <footer className="border-t border-[var(--color-border)] mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-muted-fg)]">
          <p>© 2026 Beantrip</p>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-[var(--color-accent)]">{t('footer.about')}</Link>
            <Link to="/privacy" className="hover:text-[var(--color-accent)]">{t('footer.privacy')}</Link>
            <Link to="/terms" className="hover:text-[var(--color-accent)]">{t('footer.terms')}</Link>
            <Link to="/impressum" className="hover:text-[var(--color-accent)]">{t('footer.impressum')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
