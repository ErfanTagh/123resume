// Service worker: holds the 123Resume login (grabbed from an open, logged-in
// 123resume.de tab), refreshes it when needed, and talks to the 123Resume API.
// Nothing here ever contacts a job board; only the content script does, in the
// user's own tab. Tokens live in chrome.storage.local and never leave the browser.

const API_BASE = "https://123resume.de/api";

async function getStored() {
  const { auth } = await chrome.storage.local.get("auth");
  return auth || null;
}

async function setStored(auth) {
  await chrome.storage.local.set({ auth });
}

/** Refresh the access token using the stored refresh token. */
async function refreshAccess() {
  const auth = await getStored();
  if (!auth?.refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: auth.refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const next = { ...auth, access: data.access };
    await setStored(next);
    return next.access;
  } catch {
    return null;
  }
}

/** Fetch with the stored token, refreshing once on a 401. Returns the Response. */
async function authedFetch(path) {
  const auth = await getStored();
  if (!auth?.access) throw new Error("not-connected");
  const call = (token) =>
    fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  let res = await call(auth.access);
  if (res.status === 401) {
    const fresh = await refreshAccess();
    if (!fresh) throw new Error("not-connected");
    res = await call(fresh);
  }
  return res;
}

/** JSON API call that throws on any non-2xx. */
async function api(path) {
  const res = await authedFetch(path);
  if (!res.ok) throw new Error(`api-${res.status}`);
  return res.json();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "store-login") {
        // From the 123resume.de content script: the site's own JWT + user.
        await setStored({ access: msg.access, refresh: msg.refresh, user: msg.user });
        sendResponse({ ok: true });
      } else if (msg.type === "status") {
        const auth = await getStored();
        sendResponse({ ok: true, connected: !!auth?.access, user: auth?.user || null });
      } else if (msg.type === "list-resumes") {
        const resumes = await api("/resumes/");
        sendResponse({ ok: true, resumes });
      } else if (msg.type === "get-resume") {
        const resume = await api(`/resumes/${msg.id}/`);
        sendResponse({ ok: true, resume });
      } else if (msg.type === "job-openings") {
        // Openings from company ATS boards (Greenhouse/Lever/Ashby) for this
        // resume. Each links to a fillable company application form. Free, no limit.
        const country = msg.country ? `&country=${encodeURIComponent(msg.country)}` : "";
        const res = await authedFetch(`/job-openings/?resume_id=${encodeURIComponent(msg.id)}${country}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) sendResponse({ ok: true, jobs: data.jobs || [] });
        else sendResponse({ ok: false, error: data.error || `api-${res.status}` });
      } else if (msg.type === "disconnect") {
        await chrome.storage.local.remove("auth");
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: "unknown-message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  })();
  return true; // async response
});
