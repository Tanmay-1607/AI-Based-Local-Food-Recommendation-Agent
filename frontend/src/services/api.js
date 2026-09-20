// Use relative '/api' via Vite proxy when running dev server, fallback to direct backend URL
const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? '/api'
  : 'http://127.0.0.1:8000/api';

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
