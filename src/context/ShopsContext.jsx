import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const ShopsContext = createContext(null);

export function ShopsProvider({ children }) {
  const [shops, setShops] = useState([]);
  const [cities, setCities] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchStarted = useRef(false);

  // Fetching the full shop list (700+ shops, ~700KB) is only needed by a
  // handful of pages (Explore, Home, Map, Favorites, ...). Most pages
  // (shop detail, auth, admin, static pages, ...) never touch this data,
  // so the fetch is triggered lazily by useShops() instead of unconditionally
  // on app mount, to avoid paying that cost on every page load.
  function ensureLoaded() {
    if (fetchStarted.current) return;
    fetchStarted.current = true;
    Promise.all([api.listShops(), api.shopsMeta()])
      .then(([shopsRes, metaRes]) => {
        setShops(shopsRes.shops);
        setCities(metaRes.cities);
        setAllTags(metaRes.allTags);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <ShopsContext.Provider value={{ shops, cities, allTags, loading, error, ensureLoaded }}>
      {children}
    </ShopsContext.Provider>
  );
}

export function useShops() {
  const ctx = useContext(ShopsContext);
  if (!ctx) throw new Error('useShops must be used within ShopsProvider');
  useEffect(() => { ctx.ensureLoaded(); }, [ctx]);
  return ctx;
}
