import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const DISMISSED_KEY = 'coffeespots:notif-prompt-dismissed';

export default function NotificationPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | enabling | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return setVisible(false);
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const enable = async () => {
    setError('');
    setStatus('enabling');
    try {
      const { requestNotificationToken } = await import('../lib/firebase');
      const token = await requestNotificationToken();
      await api.registerDeviceToken(token);
      localStorage.setItem(DISMISSED_KEY, '1');
      setVisible(false);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-lg p-4">
      <p className="text-sm font-semibold">Don't miss out</p>
      <p className="text-sm text-[var(--color-muted-fg)] mt-1">
        Turn on notifications to hear when your suggestions are approved and new spots open near you.
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={enable}
          disabled={status === 'enabling'}
          className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold text-sm disabled:opacity-60"
        >
          {status === 'enabling' ? 'Enabling…' : 'Enable notifications'}
        </button>
        <button
          onClick={dismiss}
          className="px-4 py-2 rounded-xl border border-[var(--color-border)] font-semibold text-sm hover:bg-[var(--color-bg)] transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
