// Dynamic API configuration:
// 1. If VITE_API_URL is configured (e.g. on Render: https://your-backend.onrender.com), use it.
// 2. If running locally on Vite (localhost:5173 / 127.0.0.1:5173), use relative '/api' via Vite dev proxy.
// 3. Fallback to direct 'http://127.0.0.1:8000/api' for local non-proxied execution.

export function getApiBaseUrl() {
  const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.trim()) {
    const trimmed = envApiUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  if (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
}

export function getApiDiagnosticInfo() {
  const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL;
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  return {
    rawEnvUrl: envApiUrl || null,
    resolvedApiBase: getApiBaseUrl(),
    isVercel,
    isMissingViteApiUrl: isVercel && (!envApiUrl || !envApiUrl.trim()),
    currentOrigin: typeof window !== 'undefined' ? window.location.origin : ''
  };
}

const API_BASE = getApiBaseUrl();

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function getMetadata() {
  const res = await fetch(`${API_BASE}/meta`);
  if (!res.ok) throw new Error(`Metadata fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function getFoodPlaces(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "" && val !== "all") {
      query.append(key, val);
    }
  });
  const res = await fetch(`${API_BASE}/food?${query.toString()}`);
  if (!res.ok) throw new Error(`Food fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function getRecommendations(payload) {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Recommendation failed (HTTP ${res.status}): ${errorText}`);
  }
  return res.json();
}

export async function chatWithAgent(message, history = []) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Agent chat failed (HTTP ${res.status}): ${errorText}`);
  }
  return res.json();
}

export async function getFoodDetail(restaurantId) {
  const res = await fetch(`${API_BASE}/food/${encodeURIComponent(restaurantId)}`);
  if (!res.ok) throw new Error(`Detail fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function submitFeedback(feedbackData) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedbackData),
  });
  if (!res.ok) throw new Error(`Feedback submission failed: HTTP ${res.status}`);
  return res.json();
}

export async function getFeedbackList() {
  const res = await fetch(`${API_BASE}/feedback`);
  if (!res.ok) throw new Error(`Feedback list failed: HTTP ${res.status}`);
  return res.json();
}

export async function getUserPreferences() {
  const res = await fetch(`${API_BASE}/preferences`);
  if (!res.ok) throw new Error(`Preferences fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function saveUserPreferences(prefs) {
  const res = await fetch(`${API_BASE}/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`Preferences save failed: HTTP ${res.status}`);
  return res.json();
}
