// Browsers register push endpoints on their vendor's push service. Only those hosts are
// allowed, otherwise a user could make the server send requests to any URL (SSRF).
const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'notify.windows.com',
  'push.apple.com',
];

export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_PUSH_HOSTS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}
