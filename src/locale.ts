/** Language of the current page, decided by URL: /es/... is the Spanish build. */
export const SPANISH = typeof location !== 'undefined' && (location.pathname === '/es' || location.pathname.startsWith('/es/'));
export const SITE_ROOT = SPANISH ? '/es/' : '/';
export const GAME_BASE = SPANISH ? '/es/play' : '/play';
