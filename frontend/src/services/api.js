// =========================================================
// LocalBite AI — Frontend API Client Service
// =========================================================

/**
 * Detects the raw backend URL from any configured environment variable.
 * Checks VITE_API_URL first, then common aliases.
 */
export function getRawEnvApiUrl() {
  if (typeof import.meta === 'undefined' || !import.meta.env) return '';
  const candidate = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_SERVER_URL ||
    ''
  );
  return typeof candidate === 'string' ? candidate.trim() : '';
}

/**
 * Normalizes any user-provided backend URL so it cleanly ends with '/api'
 * without duplicate '/api/api' or missing/multiple slashes.
 */
export function normalizeApiUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return '';
  }
  let clean = rawUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/api')) {
    return clean;
  }
  return `${clean}/api`;
}

/**
 * Checks whether the current runtime environment is local development.
 */
export function isLocalEnvironment() {
  if (typeof window === 'undefined') return true;
  const { hostname, port } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    port === '5173' ||
    port === '3000'
  );
}

/**
 * Checks for a stored or query-parameter backend URL in browser runtime.
 * Allows quick configuration directly without waiting for a redeploy.
 */
export function getStoredApiUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('api') || params.get('apiUrl') || params.get('backend');
    if (queryUrl && queryUrl.trim()) {
      const clean = queryUrl.trim();
      localStorage.setItem('localbite_custom_api_url', clean);
      return clean;
    }
    const stored = localStorage.getItem('localbite_custom_api_url');
    if (stored && stored.trim()) {
      return stored.trim();
    }
  } catch (e) {
    // Graceful fallback if localStorage is disabled
  }
  return '';
}

/**
 * Persists a custom backend URL in browser localStorage.
 */
export function setCustomApiUrl(url) {
  if (typeof window === 'undefined') return;
  try {
    if (url && url.trim()) {
      localStorage.setItem('localbite_custom_api_url', url.trim());
    } else {
      localStorage.removeItem('localbite_custom_api_url');
    }
  } catch (e) {}
}

/**
 * Resolves the active API base URL:
 * 1. Reads VITE_API_URL or aliases (highest priority for Render/Production build).
 * 2. Reads stored custom URL (if provided in browser query/input).
 * 3. If running locally under Vite dev server (port 5173), uses relative '/api' proxy.
 * 4. If running locally outside Vite proxy, falls back to direct 'http://127.0.0.1:8000/api'.
 * 5. In production (e.g., Vercel), returns empty string if unconfigured.
 *    (Never falls back to localhost in production!)
 */
export function getApiBaseUrl() {
  const envApiUrl = getRawEnvApiUrl();
  if (envApiUrl) {
    return normalizeApiUrl(envApiUrl);
  }

  const storedUrl = getStoredApiUrl();
  if (storedUrl) {
    return normalizeApiUrl(storedUrl);
  }

  // Development-only fallback
  if (isLocalEnvironment()) {
    if (typeof window !== 'undefined' && window.location.port === '5173') {
      return '/api';
    }
    return 'http://127.0.0.1:8000/api';
  }

  // Production without configured URL: do not guess or fallback to localhost
  return '';
}

/**
 * Constructs a fully qualified endpoint URL, validating production configuration.
 */
export function getEndpointUrl(endpoint) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "VITE_API_URL is not set in Vercel. Frontend cannot connect to your Render backend without it."
    );
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

/**
 * Returns safe diagnostic metadata for the UI to display helpful setup guidance.
 * Never exposes secrets.
 */
export function getApiDiagnosticInfo() {
  const envApiUrl = getRawEnvApiUrl();
  const storedUrl = getStoredApiUrl();
  const isLocal = isLocalEnvironment();
  const apiBase = getApiBaseUrl();
  const isConfigured = Boolean(apiBase && apiBase.startsWith('http'));
  const isMissing = !isLocal && !isConfigured;

  let configSource = 'None (Awaiting Configuration)';
  if (envApiUrl) {
    configSource = 'Vercel Environment Variable (Build-Time)';
  } else if (storedUrl) {
    configSource = 'Browser Storage / URL Query (?api=)';
  } else if (isLocal) {
    configSource = 'Localhost Development Proxy';
  }

  return {
    rawEnvUrl: envApiUrl || null,
    hasEnvVar: Boolean(envApiUrl),
    hasStoredUrl: Boolean(storedUrl),
    configSource,
    resolvedApiBase: apiBase || '(Not Configured — Awaiting Vercel Environment Variable)',
    isConfigured,
    isLocal,
    isMissingProductionApiUrl: isMissing,
    isMissingViteApiUrl: isMissing, // Alias for component compatibility
    currentOrigin: typeof window !== 'undefined' ? window.location.origin : ''
  };
}

// ---------------------------------------------------------
// API Client Functions
// ---------------------------------------------------------

export async function checkHealth() {
  const url = getEndpointUrl('/health');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function getMetadata() {
  const url = getEndpointUrl('/meta');
  const res = await fetch(url);
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
  const queryString = query.toString() ? `?${query.toString()}` : '';
  const url = getEndpointUrl(`/food${queryString}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Food fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function getRecommendations(payload) {
  const url = getEndpointUrl('/recommend');
  const res = await fetch(url, {
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
  const url = getEndpointUrl('/chat');
  const res = await fetch(url, {
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
  const url = getEndpointUrl(`/food/${encodeURIComponent(restaurantId)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Detail fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function submitFeedback(feedbackData) {
  const url = getEndpointUrl('/feedback');
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedbackData),
  });
  if (!res.ok) throw new Error(`Feedback submission failed: HTTP ${res.status}`);
  return res.json();
}

export async function getFeedbackList() {
  const url = getEndpointUrl('/feedback');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feedback list failed: HTTP ${res.status}`);
  return res.json();
}

export async function getUserPreferences() {
  const url = getEndpointUrl('/preferences');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Preferences fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function saveUserPreferences(prefs) {
  const url = getEndpointUrl('/preferences');
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`Preferences save failed: HTTP ${res.status}`);
  return res.json();
}
