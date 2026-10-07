import './googleAnalytics.css';

const measurementId = 'G-NCWBHEH877';
const consentKey = 'chezzies-google-analytics-consent-v1';
const production = ['chezzies.app', 'www.chezzies.app'].includes(location.hostname);
const analyticsWindow = window as typeof window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean;
};
let allowed = false;
let loaded = false;
let panel: HTMLElement | undefined;

function cleanLocation() {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  // Account/reset routes may contain sensitive context. Group gameplay together.
  if (url.pathname.startsWith('/play')) url.pathname = '/play/';
  return url.origin + url.pathname;
}

function start() {
  if (!production || loaded) return;
  loaded = true;
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
  analyticsWindow.gtag = function () { analyticsWindow.dataLayer!.push(arguments); };
  analyticsWindow.gtag('consent', 'default', {
    analytics_storage: 'granted', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  });
  analyticsWindow.gtag('js', new Date());
  analyticsWindow.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: cleanLocation(),
    page_referrer: '',
    page_title: location.pathname.startsWith('/play') ? 'Play CHEZZIES' : document.title,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
  analyticsWindow.gtag('event', 'page_view', { page_location: cleanLocation(), page_referrer: '' });
}

function choose(value: boolean) {
  allowed = value;
  try { localStorage.setItem(consentKey, value ? 'granted' : 'denied'); } catch { /* Session-only choice. */ }
  analyticsWindow[`ga-disable-${measurementId}`] = !value;
  panel?.remove();
  panel = undefined;
  if (value) start();
  else if (loaded) {
    // Reload after revocation so Google's running script cannot keep observing the page.
    for (const entry of document.cookie.split(';')) {
      const name = entry.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', '; Domain=chezzies.app', '; Domain=www.chezzies.app']) {
        document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax; Secure`;
      }
    }
    location.reload();
  }
}

function showChoices() {
  if (panel) return;
  panel = document.createElement('section');
  panel.className = 'ga-consent';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Optional analytics');
  const description = document.createElement('p');
  description.textContent = 'For parents: allow optional Google Analytics cookies to help us understand visits and game activity? We do not send names, email addresses or saved games. You can play without accepting and change your choice at any time.';
  const link = document.createElement('a');
  link.href = '/parents/#section-5';
  link.textContent = 'About analytics';
  const buttons = document.createElement('div');
  for (const [label, value] of [['No thanks', false], ['Allow analytics', true]] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = () => choose(value);
    buttons.append(button);
  }
  panel.append(description, link, buttons);
  document.body.append(panel);
}

export function trackGoogle(event: string, data: {source: string; landing_page: string}) {
  if (!production || !allowed) return;
  analyticsWindow.gtag?.('event', event, {
    traffic_source: data.source, landing_page: data.landing_page,
    page_location: cleanLocation(), page_referrer: '',
  });
}

if (production) {
  let saved: string | null = null;
  try { saved = localStorage.getItem(consentKey); } catch { /* Ask without persistent storage. */ }
  allowed = saved === 'granted';
  analyticsWindow[`ga-disable-${measurementId}`] = !allowed;
  if (allowed) start();
  else if (saved !== 'denied') showChoices();
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'ga-settings';
  settings.textContent = 'Privacy settings';
  settings.onclick = showChoices;
  document.body.append(settings);
  window.addEventListener('storage', event => {
    if (event.key === consentKey) location.reload();
  });
}
