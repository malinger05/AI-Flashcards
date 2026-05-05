export const API_BASE = "http://127.0.0.1:8000";

/** Authenticated fetch — automatically adds Bearer token */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("fc_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res;
}
