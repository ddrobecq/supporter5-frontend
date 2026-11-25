import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { env } from '../config/env';

const HIT_PATH = '/api/trafic/hit';

interface PageHitBody {
  path: string;
  referrer?: string;
}

// Module-level so the referrer is only sent once per SPA session, even if the layout remounts.
let referrerConsumed = false;

function buildHitUrl(): string {
  return `${env.apiBaseUrl.replace(/\/+$/, '')}${HIT_PATH}`;
}

function sendPageHit(body: PageHitBody): void {
  const url = buildHitUrl();
  const payload = JSON.stringify(body);

  let queued = false;
  if (typeof navigator.sendBeacon === 'function') {
    try {
      // text/plain keeps the request "simple" and avoids a CORS preflight.
      queued = navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain' }));
    } catch {
      queued = false;
    }
  }
  if (queued) return;

  fetch(url, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'text/plain' } })
    // Tracking is best-effort: a failed hit must neither break navigation nor surface anything to the user.
    .catch(() => undefined);
}

export function usePageTracking(): void {
  const { pathname } = useLocation();
  const lastSentPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (lastSentPathRef.current === pathname) return;
    lastSentPathRef.current = pathname;

    const body: PageHitBody = { path: pathname };
    if (!referrerConsumed) {
      referrerConsumed = true;
      if (document.referrer) body.referrer = document.referrer;
    }
    sendPageHit(body);
  }, [pathname]);
}
