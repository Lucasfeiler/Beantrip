import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function ShopQRCode({ slug }) {
  const [dataUrl, setDataUrl] = useState(null);
  const checkInUrl = `https://beantrip.com/shop/${slug}?checkin=1`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(checkInUrl, { width: 480, margin: 2 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [checkInUrl]);

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold mb-2">QR code check-in</p>
      <p className="text-xs text-[var(--color-muted-fg)] mb-3">
        Print this and put it on a table or the counter. Customers scan it in the Beantrip app to
        land straight on your page, already marked as visited.
      </p>
      {dataUrl && (
        <div className="flex items-center gap-4">
          <img src={dataUrl} alt="Check-in QR code" className="w-32 h-32 rounded-lg border border-[var(--color-border)]" />
          <a
            href={dataUrl}
            download={`beantrip-${slug}-qr.png`}
            className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            Download PNG
          </a>
        </div>
      )}
    </div>
  );
}
