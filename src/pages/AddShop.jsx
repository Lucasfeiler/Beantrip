import { useEffect, useState } from 'react';
import { useShops } from '../context/ShopsContext';
import { api } from '../lib/api';
import PageMeta from '../components/PageMeta';

export default function AddShop() {
  const { cities } = useShops();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', city: cities[0] || '', neighborhood: '', address: '', description: '' });

  useEffect(() => {
    if (!form.city && cities.length > 0) setForm((f) => ({ ...f, city: cities[0] }));
  }, [cities]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitShop(form);
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
        <p className="font-display text-2xl mb-3">Thanks for the suggestion!</p>
        <p className="text-sm text-[var(--color-muted-fg)]">
          "{form.name}" has been queued for review.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-8 py-12">
      <PageMeta
        title="Add a Coffee Spot \u2014 Beantrip"
        description="Know a specialty coffee shop that belongs on Beantrip? Send it in and we will take a look."
        canonical="/add-shop"
      />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold">Add a Coffee Spot</h1>
      <p className="text-[var(--color-muted-fg)] mt-2">Know a great specialty coffee shop we're missing?</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <Field label="Shop name">
          <input required value={form.name} onChange={update('name')} className={inputClass} placeholder="e.g. Kaffeewerkstatt" />
        </Field>
        <Field label="City">
          <select value={form.city} onChange={update('city')} className={inputClass}>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Neighborhood">
          <input value={form.neighborhood} onChange={update('neighborhood')} className={inputClass} placeholder="e.g. Glockenbach" />
        </Field>
        <Field label="Address">
          <input required value={form.address} onChange={update('address')} className={inputClass} placeholder="Street, postcode, city" />
        </Field>
        <Field label="What makes it worth a visit?">
          <textarea value={form.description} onChange={update('description')} rows={4} className={inputClass} placeholder="Tell us about the vibe, the beans, the standout drink…" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={submitting} type="submit" className="mt-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit spot'}
        </button>
      </form>
    </div>
  );
}

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
