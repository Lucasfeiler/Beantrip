import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

// Only ever renders inside the native app (Appilix injects `window.appilix`
// into the WebView) -- there's no camera bridge to call on the plain website.
export default function QRCheckIn() {
  const [available, setAvailable] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    setAvailable(typeof window !== 'undefined' && !!window.appilix);
  }, []);

  if (!available) return null;

  const scan = () => {
    window.appilix.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      window.appilix.onmessage = null;

      const status = data?.response?.status;
      if (status === 'camera_permission_missing') {
        alert(t('qr.permissionMissing'));
        return;
      }
      if (status !== 'success') return;

      const raw = data.response.result;
      try {
        const url = new URL(raw);
        if (!url.hostname.endsWith('beantrip.com') || !url.pathname.startsWith('/shop/')) {
          alert(t('qr.notBeantripCode'));
          return;
        }
        navigate(`${url.pathname}${url.search || '?checkin=1'}`);
      } catch {
        alert(t('qr.notBeantripCode'));
      }
    };

    window.appilix.postMessage(JSON.stringify({
      type: 'qr_scanner_init',
      props: { enable_confirmation_popup: false },
    }));
  };

  return (
    <button
      type="button"
      onClick={scan}
      aria-label={t('qr.scanButton')}
      className="fixed bottom-20 sm:bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-lg flex items-center justify-center text-2xl hover:opacity-90 transition-opacity"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
      </svg>
    </button>
  );
}
