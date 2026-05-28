/** True when the SPA is served from a loopback hostname (defense-in-depth for dev-only billing UI). */
export function isLocalhostAppHost(): boolean {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}
