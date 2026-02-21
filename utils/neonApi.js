const API_URL = process.env.EXPO_PUBLIC_NEON_DATA_API_URL;
const API_JWT = process.env.EXPO_PUBLIC_NEON_DATA_API_JWT;

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const authHeaders = API_JWT
  ? { Authorization: `Bearer ${API_JWT}` }
  : {};

const buildUrl = (path) => {
  if (!API_URL) return null;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const neonFetch = async (path, options = {}) => {
  const url = buildUrl(path);
  if (!url) {
    throw new Error('NEON_DATA_API_URL is not set');
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon API error ${res.status}: ${text}`);
  }

  return res.json();
};

export const neonPost = (path, body, headers = {}) =>
  neonFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });

export const neonPatch = (path, body, headers = {}) =>
  neonFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers,
  });

export const neonGet = (path, headers = {}) =>
  neonFetch(path, {
    method: 'GET',
    headers,
  });
