// Tiny stale-while-revalidate cache for client pages. Pages paint the last
// response instantly, then refresh in the background. Lives for the tab session.
const store = new Map<string, any>();

export function peek<T = any>(url: string): T | undefined {
  return store.get(url);
}

export async function fetchJson<T = any>(url: string): Promise<T | { success: false }> {
  try {
    const r = await fetch(url);
    const j = await r.json();
    if (j?.success) store.set(url, j);
    return j;
  } catch {
    return { success: false };
  }
}

// Drop everything on login/logout so one user never sees another's data
export function clearCache() {
  store.clear();
}
