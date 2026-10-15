import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta';

const buttonPrimary =
  'inline-block px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm hover:opacity-90 transition-opacity';
const buttonSecondary =
  'inline-block px-5 py-2.5 rounded-xl border border-[var(--color-border)] font-semibold text-sm hover:bg-[var(--color-card)] transition-colors';

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-16">
      <PageMeta
        title="About Us — Beantrip"
        description="Beantrip connects people who love coffee in special locations anywhere in the world."
        canonical="/about"
      />

      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">About us</p>
      <h1 className="font-display text-3xl sm:text-5xl font-semibold mt-3 leading-tight">
        Beantrip connects people who love coffee in special locations anywhere in the world!
      </h1>

      <div className="mt-10 space-y-8 text-[var(--color-muted-fg)] leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-fg)] mb-2">What we do</h2>
          <p>
            Beantrip is a guide to specialty coffee shops. Browse a city, filter by roast, brewing
            method or vibe, and find the place that fits the moment. Save the spots you love and mark
            the ones you've been to, so your coffee trips are always at your fingertips.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-fg)] mb-2">Why it exists</h2>
          <p>
            A great cup of coffee is better when you know where to find it. Whether you're at home or
            on the road, Beantrip points you to places that care about what's in the cup, and to the
            people who love it as much as you do.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-fg)] mb-2">Help us grow the map</h2>
          <p>
            We're adding new shops and cities all the time. Know a special place we're missing, or have
            an idea to make Beantrip better? We'd love to hear from you.
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/explore" className={buttonPrimary}>Explore coffee shops</Link>
        <Link to="/add-shop" className={buttonSecondary}>Suggest a spot</Link>
        <Link to="/feedback" className={buttonSecondary}>Send feedback</Link>
      </div>
    </div>
  );
}
